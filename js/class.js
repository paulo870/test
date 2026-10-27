// ============================================================
// POLIGLOTA CLASSROOM AUTHENTICATION
// File: js/class.js
// ============================================================

(() => {
    "use strict";

    const client = window.supabaseClient;

    if (!client) {
        console.error("Supabase client is unavailable.");

        window.location.replace("index.html");
        return;
    }

    let classroomAuthorized = false;

    async function verifyClassroomAccess() {
        try {
            const {
                data: { session },
                error: sessionError
            } = await client.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!session?.user) {
                window.location.replace("index.html");
                return false;
            }

            const { data: profile, error: profileError } =
                await client
                    .from("profiles")
                    .select("id, role, is_active")
                    .eq("id", session.user.id)
                    .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!profile) {
                await client.auth.signOut();

                window.location.replace("index.html");
                return false;
            }

            if (profile.is_active === false) {
                await client.auth.signOut();

                window.location.replace("index.html");
                return false;
            }

            const role = String(profile.role || "").toLowerCase();

            if (!["admin", "teacher", "student"].includes(role)) {
                await client.auth.signOut();

                window.location.replace("index.html");
                return false;
            }

            window.poliglotaCurrentUser = {
                id: profile.id,
                role: role
            };

            classroomAuthorized = true;

            document.dispatchEvent(
                new CustomEvent("poliglota:classroom-authorized", {
                    detail: {
                        user: window.poliglotaCurrentUser
                    }
                })
            );

            return true;

        } catch (error) {
            console.error(
                "Classroom access verification failed:",
                error
            );

            window.location.replace("index.html");
            return false;
        }
    }

    // --------------------------------------------------------
    // Sign-out helper for classroom controls
    // --------------------------------------------------------

    window.poliglotaSignOut = async function () {
        try {
            const { error } = await client.auth.signOut();

            if (error) {
                throw error;
            }

            window.poliglotaCurrentUser = null;

            window.location.replace("index.html");

        } catch (error) {
            console.error("Sign-out failed:", error);

            alert(
                "Unable to sign out. Please try again."
            );
        }
    };

    // --------------------------------------------------------
    // Start the existing classroom only after authorization.
    // --------------------------------------------------------

    window.poliglotaClassroomReady = verifyClassroomAccess();

})();
