import { db } from "./firebase.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
// ======================================
// NNAMP SESSION MANAGER
// ======================================
 // 3 minutes
const INACTIVITY_LIMIT = 3 * 60 * 1000;
const COUNTDOWN_SECONDS = 5;

let inactivityTimer = null;
let countdownTimer = null;
let countdown = COUNTDOWN_SECONDS;

let forceLogout = false;
let appHiddenTime = null;

// ======================================
// START SESSION
// ======================================

export function initSessionManager(auth) {

    function resetInactivityTimer() {

        clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(() => {

            showLogoutPopup();

        }, INACTIVITY_LIMIT);

    }

    // ======================================
    // USER ACTIVITY
    // ======================================

    [
        "click",
        "mousemove",
        "keydown",
        "touchstart",
        "scroll"
    ].forEach(event => {

        document.addEventListener(event, () => {

            const overlay =
                document.getElementById("logoutOverlay");

            if (
                overlay &&
                !overlay.classList.contains("show")
            ) {

                resetInactivityTimer();

            }

        });

    });

    resetInactivityTimer();

    // logout function available globally

    window.logoutUser = async function () {

        try {

            clearTimeout(inactivityTimer);

            clearInterval(countdownTimer);

            await auth.signOut();

            localStorage.clear();

            sessionStorage.clear();

            window.location.href = "login.html";

        } catch (e) {

            console.error(e);

            window.location.href = "login.html";

        }

    };
    auth.onAuthStateChanged((user) => {

    if (!user) return;

    onSnapshot(doc(db, "users", user.uid), (snap) => {

        if (!snap.exists()) return;

        const userData = snap.data();

        if (
    userData.status === "suspended" &&
    userData.admin !== true
) {

    showAlert(
        "Account Suspended ❌",
        "Your account has been suspended.\n\nContact support/Admin.",
        "error"
    );

    window.logoutUser();

}

    });

});
        // ======================================
    // USER LEAVES / RETURNS
    // ======================================

    document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        appHiddenTime = Date.now();

        localStorage.setItem(
            "nnamp_last_hidden",
            appHiddenTime
        );

        return;

    }

        const lastHidden =
    Number(localStorage.getItem("nnamp_last_hidden"));

if (lastHidden) {

    const awayTime =
        Date.now() - lastHidden;

    if (awayTime >= INACTIVITY_LIMIT) {

        forceLogout = true;

        showLogoutPopup(true);

    }

    localStorage.removeItem("nnamp_last_hidden");

    appHiddenTime = null;

}

    });
    window.addEventListener("focus", () => {

    const lastHidden =
        Number(localStorage.getItem("nnamp_last_hidden"));

    if (!lastHidden) return;

    const awayTime = Date.now() - lastHidden;

    if (awayTime >= INACTIVITY_LIMIT) {

        window.logoutUser();

    }

});

    // ======================================
    // SHOW LOGOUT POPUP
    // ======================================

    function showLogoutPopup(expired = false) {

        const overlay =
            document.getElementById("logoutOverlay");

        if (!overlay) return;

        overlay.classList.add("show");

        const countdownNumber =
            document.getElementById("countdownNumber");

        const circle =
            document.getElementById("circleProgress");

        if (expired) {

    forceLogout = true;

    countdown = 0;

    countdownNumber.textContent = "0";

    if (circle) {

        circle.style.strokeDashoffset = 345;

    }

    // User sees the expired popup first,
    // then logout after 3 seconds.

    setTimeout(() => {

        window.logoutUser();

    }, 3000);

    return;

}

        forceLogout = false;

        countdown = COUNTDOWN_SECONDS;

        countdownNumber.textContent = countdown;

        if (circle) {

            circle.style.strokeDashoffset = 0;

        }

        clearInterval(countdownTimer);

        countdownTimer = setInterval(() => {

            countdown--;

            countdownNumber.textContent = countdown;

            if (circle) {

                const totalLength = 345;

                const progress =
                    totalLength -
                    ((countdown / COUNTDOWN_SECONDS) * totalLength);

                circle.style.strokeDashoffset = progress;

            }

            if (countdown <= 0) {

                clearInterval(countdownTimer);

                window.logoutUser();

            }

        }, 1000);
    }
        // ======================================
    // HIDE POPUP
    // ======================================

    function hideLogoutPopup() {

        forceLogout = false;

        clearInterval(countdownTimer);

        const overlay =
            document.getElementById("logoutOverlay");

        if (overlay) {

            overlay.classList.remove("show");

        }

        const circle =
            document.getElementById("circleProgress");

        if (circle) {

            circle.style.strokeDashoffset = 0;

        }

        resetInactivityTimer();

    }

    // ======================================
    // STAY LOGGED IN BUTTON
    // ======================================

    document.addEventListener("DOMContentLoaded", () => {

        const btn =
            document.getElementById("stayLoggedInBtn");

        if (btn) {

            btn.addEventListener("click", () => {

                if (forceLogout) {

                    window.logoutUser();

                    return;

                }

                hideLogoutPopup();

            });

        }

    });

} // ===== END initSessionManager =====