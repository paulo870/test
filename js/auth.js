// ============================================================
// POLIGLOTA AUTHENTICATION
// File: js/auth.js
// ============================================================

(() => {
    "use strict";

    const client = window.supabaseClient;

    const form = document.getElementById("teacher-login-form");
    const usernameInput = document.getElementById("teacher-username");
    const passwordInput = document.getElementById("teacher-password");
    const submitButton = document.getElementById("login-submit-btn");
    const errorMessage = document.getElementById("password-error");

    if (!client) {
        console.error(
            "Supabase is not initialized. Check js/supabase.js."
        );

        showError(
            "The authentication service could not be initialized. Please refresh the page."
        );

        return;
    }

    // --------------------------------------------------------
    // Display authentication errors
    // --------------------------------------------------------

    function showError(message) {
        if (!errorMessage) return;

        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }

    function clearError() {
        if (!errorMessage) return;

        errorMessage.textContent = "";
        errorMessage.style.display = "none";
    }

    // --------------------------------------------------------
    // Redirect according to the authenticated user's role
    // --------------------------------------------------------

    function redirectByRole(user) {
        const role = String(user?.role || "").toLowerCase();

        if (role === "admin") {
            window.location.replace("admin.html");
            return;
        }

        if (role === "teacher" || role === "student") {
            window.location.replace("class.html");
            return;
        }

        throw new Error(
            "Your account does not have a recognized role. Please contact an administrator."
        );
    }

    // --------------------------------------------------------
    // Sign-in form
    // --------------------------------------------------------

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            clearError();

            const username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!username || !password) {
                showError("Please enter your username and password.");
                return;
            }

            const originalButtonText = submitButton?.textContent;

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Signing in...";
            }

            try {
                // Preserve the existing Edge Function authentication flow.
                const { data, error } = await client.functions.invoke(
                    "hyper-handler",
                    {
                        body: {
                            username,
                            password
                        }
                    }
                );

                if (error) {
                    throw error;
                }

                if (!data || data.success !== true) {
                    throw new Error(
                        data?.message ||
                        data?.error ||
                        "Invalid username or password."
                    );
                }

                if (
                    !data.session?.access_token ||
                    !data.session?.refresh_token
                ) {
                    throw new Error(
                        "Authentication succeeded, but the session was not returned."
                    );
                }

                if (!data.user?.id || !data.user?.role) {
                    throw new Error(
                        "Your account information is incomplete. Please contact an administrator."
                    );
                }

                // Store the session in Supabase Auth.
                const { error: sessionError } =
                    await client.auth.setSession({
                        access_token: data.session.access_token,
                        refresh_token: data.session.refresh_token
                    });

                if (sessionError) {
                    throw sessionError;
                }

                // Preserve the existing current-user convention.
                window.poliglotaCurrentUser = data.user;

                // Navigate to the correct protected page.
                redirectByRole(data.user);

            } catch (error) {
                console.error("Sign-in error:", error);

                showError(
                    error?.message ||
                    "Unable to sign in. Please try again."
                );

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent =
                        originalButtonText || "Sign In";
                }
            }
        });
    }

    // --------------------------------------------------------
    // If an existing authenticated session is found, redirect.
    // --------------------------------------------------------

    async function checkExistingSession() {
        try {
            const {
                data: { session },
                error
            } = await client.auth.getSession();

            if (error) {
                throw error;
            }

            if (!session?.user) {
                return;
            }

            /*
             * Do not guess the role from session.user.
             * Retrieve the authoritative role from profiles.
             */

            const { data: profile, error: profileError } =
                await client
                    .from("profiles")
                    .select("id, role, is_active")
                    .eq("id", session.user.id)
                    .maybeSingle();

            if (profileError) {
                console.error(
                    "Unable to retrieve user profile:",
                    profileError
                );

                return;
            }

            if (!profile) {
                await client.auth.signOut();
                return;
            }

            if (profile.is_active === false) {
                await client.auth.signOut();

                showError(
                    "Your account is inactive. Please contact an administrator."
                );

                return;
            }

            redirectByRole({
                id: profile.id,
                role: profile.role
            });

        } catch (error) {
            console.error(
                "Session verification error:",
                error
            );
        }
    }

    checkExistingSession();

})();
