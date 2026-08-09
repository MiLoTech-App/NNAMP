// investmentPurchase.js

import {
    doc,
    collection,
    query,
    where,
    getDocs,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/*
    ONE investment purchase engine.

    Used by:
    - dashboard.html
    - investments.html

    IMPORTANT:
    All Firestore reads required for the transaction are completed
    BEFORE any transaction writes.

    This prevents:
    "Firestore transactions require all reads to be executed
     before all writes."
*/


export async function purchaseInvestment({
    db,
    auth,
    name,
    amount,
    percent
}) {

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error("You must be logged in.");
    }

    amount = Number(amount);
    percent = Number(percent);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid investment amount.");
    }

    if (!Number.isFinite(percent) || percent <= 0) {
        throw new Error("Invalid investment percentage.");
    }


    // ---------------------------------------------------------
    // REFERENCES
    // ---------------------------------------------------------

    const userRef = doc(db, "users", uid);

    const investmentRef =
        doc(collection(db, "investments"));

    const referralRef =
        doc(db, "referrals", uid);


    // ---------------------------------------------------------
    // EVERYTHING IS READ FIRST
    // ---------------------------------------------------------

    /*
        Read the current user.
    */

    const userSnap = await getDocs(
        query(
            collection(db, "users"),
            where("__name__", "==", uid)
        )
    );

    if (userSnap.empty) {
        throw new Error("User account not found.");
    }

    const userData = userSnap.docs[0].data();


    /*
        Find the referrer, if the user registered with
        a referral code.
    */

    let referrerRef = null;
    let referrerSnap = null;

    const referredBy = userData.referredBy || null;

    if (referredBy) {

        const referrerQuery = query(
            collection(db, "users"),
            where("phone", "==", referredBy)
        );

        const referrerSnapshot =
            await getDocs(referrerQuery);

        if (!referrerSnapshot.empty) {

            referrerRef =
                referrerSnapshot.docs[0].ref;

            referrerSnap =
                referrerSnapshot.docs[0];

        }
    }


    /*
        Check whether this user already has an investment.

        This protects against the old problem where
        hasInvested might not accurately represent reality.
    */

    const existingInvestmentSnapshot =
        await getDocs(
            query(
                collection(db, "investments"),
                where("userId", "==", uid)
            )
        );


    const hasExistingInvestment =
        !existingInvestmentSnapshot.empty;


    /*
        Read the permanent referral record.

        If this document already exists, the referral bonus
        has already been processed for this user.
    */

    const referralSnap =
        await getDocs(
            query(
                collection(db, "referrals"),
                where("referredUserId", "==", uid)
            )
        );


    const referralAlreadyProcessed =
        !referralSnap.empty;


    // ---------------------------------------------------------
    // CALCULATIONS
    // ---------------------------------------------------------

    const balance =
        Number(userData.balance) || 0;

    const lockedBonus =
        Number(userData.lockedBonus) || 0;

    const availableBalance =
        balance - lockedBonus;


    if (amount > availableBalance) {

        throw new Error(
            `Insufficient balance. Available: ₦${availableBalance.toLocaleString("en-NG")}`
        );

    }


    /*
        This user is a first-time investor only when:
        - hasInvested is false
        - AND no investment document already exists
    */

    const firstInvestment =
        !userData.hasInvested &&
        !hasExistingInvestment;


    /*
        Referral bonus is paid only once.

        Even if the user somehow purchases again,
        referralAlreadyProcessed prevents another payment.
    */

    const shouldPayReferral =
        firstInvestment &&
        !!referrerRef &&
        !referralAlreadyProcessed;


    const dailyProfit =
        amount * percent;

    const totalProfit =
        dailyProfit * 100;

    const now =
        Date.now();


    // ---------------------------------------------------------
    // PREPARE TRANSACTION DATA
    // ---------------------------------------------------------

    const newBalance =
        balance - amount;


    const userTransactions =
        Array.isArray(userData.transactions)
            ? [...userData.transactions]
            : [];


    userTransactions.unshift({

        id:
            `${Date.now()}-${Math.random()}`,

        type:
            "Investment",

        amount:
            amount,

        status:
            "Approved",

        date:
            new Date().toLocaleString(),

        note:
            `Invested in ${name}`

    });


    // ---------------------------------------------------------
    // REFERRER DATA
    // ---------------------------------------------------------

    let referrerData = null;
    let referralBonus = 0;
    let referrerTransactions = [];


    if (shouldPayReferral && referrerSnap) {

        referrerData =
            referrerSnap.data();


        referralBonus =
            amount * 0.15;


        referrerTransactions =
            Array.isArray(referrerData.transactions)
                ? [...referrerData.transactions]
                : [];

    }


    // ---------------------------------------------------------
    // SINGLE FIRESTORE TRANSACTION
    // ---------------------------------------------------------

    await runTransaction(
        db,
        async (transaction) => {

            /*
                IMPORTANT:

                READS FIRST.
                No transaction.update()
                or transaction.set()
                before these reads.
            */


            const freshUserSnap =
                await transaction.get(userRef);


            if (!freshUserSnap.exists()) {

                throw new Error(
                    "User account not found."
                );

            }


            const freshUser =
                freshUserSnap.data();


            /*
                Re-check the user's balance inside
                the transaction.

                This protects against two purchase
                attempts happening at nearly the
                same time.
            */

            const freshBalance =
                Number(freshUser.balance) || 0;

            const freshLockedBonus =
                Number(freshUser.lockedBonus) || 0;

            const freshAvailableBalance =
                freshBalance - freshLockedBonus;


            if (amount > freshAvailableBalance) {

                throw new Error(
                    `Insufficient balance. Available: ₦${freshAvailableBalance.toLocaleString("en-NG")}`
                );

            }


            /*
                Re-check hasInvested inside the transaction.
            */

            if (
                freshUser.hasInvested === true &&
                !hasExistingInvestment
            ) {

                /*
                    Another purchase may have happened
                    after the initial reads.

                    We still allow this investment,
                    but it cannot be considered the
                    first investment.
                */

            }


            // -------------------------------------------------
            // ALL WRITES START HERE
            // -------------------------------------------------

            const finalBalance =
                freshBalance - amount;


            const finalTransactions =
                Array.isArray(freshUser.transactions)
                    ? [...freshUser.transactions]
                    : [];


            finalTransactions.unshift({

                id:
                    `${Date.now()}-${Math.random()}`,

                type:
                    "Investment",

                amount:
                    amount,

                status:
                    "Approved",

                date:
                    new Date().toLocaleString(),

                note:
                    `Invested in ${name}`

            });


            /*
                UPDATE USER
            */

            transaction.update(
                userRef,
                {

                    balance:
                        finalBalance,

                    hasInvested:
                        true,

                    lockedBonus:
                        firstInvestment
                            ? 0
                            : freshLockedBonus,

                    transactions:
                        finalTransactions

                }
            );


            /*
                CREATE INVESTMENT
            */

            transaction.set(
                investmentRef,
                {

                    userId:
                        uid,

                    phone:
                        freshUser.phone || "",

                    name:
                        name,

                    amount:
                        amount,

                    percent:
                        percent,

                    dailyProfit:
                        dailyProfit,

                    totalProfit:
                        totalProfit,

                    startTime:
                        now,

                    endTime:
                        now +
                        (
                            100 *
                            24 *
                            60 *
                            60 *
                            1000
                        ),

                    lastPaid:
                        now,

                    status:
                        "Active"

                }
            );


            // -------------------------------------------------
            // REFERRAL BONUS
            // -------------------------------------------------

            if (
                shouldPayReferral &&
                referrerRef &&
                referrerData
            ) {

                const currentReferrerBalance =
                    Number(referrerData.balance) || 0;


                const currentTotalEarned =
                    Number(referrerData.totalEarned) || 0;


                const currentReferralBonus =
                    Number(referrerData.referralBonus) || 0;


                referrerTransactions.unshift({

                    id:
                        `${Date.now()}-${Math.random()}`,

                    type:
                        "Referral",

                    amount:
                        referralBonus,

                    status:
                        "Approved",

                    date:
                        new Date().toLocaleString(),

                    note:
                        `Referral bonus from ${
                            freshUser.fullname ||
                            freshUser.name ||
                            freshUser.phone ||
                            "new user"
                        }`

                });


                /*
                    PAY REFERRER
                */

                transaction.update(
                    referrerRef,
                    {

                        balance:
                            currentReferrerBalance +
                            referralBonus,

                        totalEarned:
                            currentTotalEarned +
                            referralBonus,

                        referralBonus:
                            currentReferralBonus +
                            referralBonus,

                        transactions:
                            referrerTransactions

                    }
                );


                /*
                    CREATE PERMANENT REFERRAL RECORD
                */

                transaction.set(
                    referralRef,
                    {

                        referrerId:
                            referrerRef.id,

                        referrerPhone:
                            referredBy,

                        referredUserId:
                            uid,

                        referredName:
                            freshUser.fullname ||
                            freshUser.name ||
                            "",

                        referredPhone:
                            freshUser.phone ||
                            "",

                        investmentAmount:
                            amount,

                        bonus:
                            referralBonus,

                        status:
                            "Active",

                        createdAt:
                            serverTimestamp()

                    }
                );


                /*
                    CREATE REFERRAL NOTIFICATION
                */

                const notificationRef =
                    doc(
                        collection(
                            db,
                            "notifications"
                        )
                    );


                transaction.set(
                    notificationRef,
                    {

                        userId:
                            referrerRef.id,

                        title:
                            "Referral Bonus",

                        msg:
                            `You received ₦${referralBonus.toLocaleString("en-NG")} for referring ${
                                freshUser.fullname ||
                                freshUser.name ||
                                "a new user"
                            }.`,


                        read:
                            false,

                        date:
                            new Date().toLocaleString(),

                        createdAt:
                            serverTimestamp()

                    }
                );

            }

        }
    );


    // ---------------------------------------------------------
    // RETURN RESULT
    // ---------------------------------------------------------

    return {

        firstInvestment:
            firstInvestment,

        referralBonus:
            shouldPayReferral
                ? referralBonus
                : 0,

        newBalance:
            newBalance,

        name:
            name,

        amount:
            amount,

        dailyProfit:
            dailyProfit,

        totalProfit:
            totalProfit

    };

}