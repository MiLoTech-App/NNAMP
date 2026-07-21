// ================= NNAMP BRAIN =================
// GLOBAL CUSTOM POPUPS - WORKS ON ALL PAGES

// 1. CUSTOM CONFIRM POPUP - WITH CANCEL AND OK BUTTONS
function showConfirm(title, message, onConfirm) {
    let confirmDiv = document.createElement("div");
    confirmDiv.className = "custom-alert";
    confirmDiv.innerHTML = `
        <div class="custom-alert-box info">
            <h3>${title}</h3>
            <p style="white-space:pre-line;">${message}</p>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="custom-alert-btn" style="background:#6c757d; flex:1;" onclick="this.closest('.custom-alert').remove()">Cancel</button>
                <button class="custom-alert-btn" id="confirmYesBtn" style="background:#0d6e2f; flex:1;">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmDiv);

    document.getElementById('confirmYesBtn').onclick = function(){
        confirmDiv.remove();
        if(onConfirm) onConfirm();
    }
}

// 2. CUSTOM ALERT POPUP - AUTO CLOSE
function showAlert(title, message, type = "info") {
    let alertDiv = document.createElement("div");
    alertDiv.className = "custom-alert";
    
    let icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    let color = type === "success" ? "#198754" : type === "error" ? "#dc3545" : "#0d6e2f";
    
    alertDiv.innerHTML = `
        <div class="custom-alert-box" style="border-top:4px solid ${color}">
            <h3>${icon} ${title}</h3>
            <p style="white-space:pre-line;">${message}</p>
            <button class="custom-alert-btn" onclick="this.closest('.custom-alert').remove()">OK</button>
        </div>
    `;
    document.body.appendChild(alertDiv);

    // Auto close after 3 seconds
    setTimeout(() => {
        if(document.body.contains(alertDiv)){
            alertDiv.remove();
        }
    }, 3000);
}

// ================= YOUR OTHER FUNCTIONS CAN GO BELOW =================
// GLOBAL CUSTOM ALERT - WORKS ON ALL PAGES
function showAlert(title, message, type = "info") {
    let alertDiv = document.createElement("div");
    alertDiv.className = "custom-alert";
    alertDiv.innerHTML = `
        <div class="custom-alert-box ${type}">
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="custom-alert-btn" onclick="this.closest('.custom-alert').remove()">OK</button>
        </div>
    `;
    document.body.appendChild(alertDiv);

    // Auto close after 3 seconds
    setTimeout(() => {
        if(document.body.contains(alertDiv)){
            alertDiv.remove();
        }
    }, 3000);
}

// LOGGED IN USER
let user = JSON.parse(localStorage.getItem('nnamp_user')) || {
  name: "", phone: "", password: "", balance: 0, lockedBonus: 1000, totalEarned: 0,
  bank: "", accountNumber: "", accountName: "", hasInvested: false, referredBy: null
};

// PLANS
const investmentPlans = [
  {id: 1, name: "Starter Plan", daily: 7, min: 3000}, {id: 2, name: "Basic Plan", daily: 7, min: 5000},
  {id: 3, name: "Standard Plan", daily: 7, min: 10000}, {id: 4, name: "Classic Plan", daily: 7, min: 20000},
  {id: 5, name: "Silver Plan", daily: 7, min: 50000}, {id: 6, name: "Gold Plan", daily: 7, min: 100000},
  {id: 7, name: "Platinum Plan", daily: 7, min: 200000}, {id: 8, name: "Premium Plan", daily: 7, min: 500000}
];
const savingsPlans = [
  {id: 1, name: "1 Month Savings", daily: 10, min: 1000, duration: 30},
  {id: 2, name: "3 Months Savings", daily: 15, min: 5000, duration: 90},
  {id: 3, name: "6 Months Savings", daily: 20, min: 10000, duration: 180},
  {id: 4, name: "1 Year Savings", daily: 25, min: 20000, duration: 365}
];
const companyBank = { name: "NNAMP LTD", bank: "OPAY", account: "8123456789" };
const REFERRAL_PERCENT = 15;

// ============ CORE FUNCTIONS ============
function saveUser() {
  localStorage.setItem('nnamp_user', JSON.stringify(user));
  let allUsers = JSON.parse(localStorage.getItem('nnamp_all_users')) || [];
  let index = allUsers.findIndex(u => u.phone === user.phone);
  if(index!== -1) { allUsers[index] = user; localStorage.setItem('nnamp_all_users', JSON.stringify(allUsers)); }
}

function getTx(phone) { return JSON.parse(localStorage.getItem('nnamp_tx_' + phone)) || []; }
function saveTx(phone, txArray) { localStorage.setItem('nnamp_tx_' + phone, JSON.stringify(txArray)); }

function addNotification(phone, message) {
  let notifs = JSON.parse(localStorage.getItem('nnamp_notifs_' + phone)) || [];
  notifs.unshift({id: Date.now(), message, date: new Date().toLocaleString(), read: false});
  localStorage.setItem('nnamp_notifs_' + phone, JSON.stringify(notifs));
}

// ============ REGISTER FUNCTION ============
function registerUser(name, phone, password, referredBy = null) {
  let allUsers = JSON.parse(localStorage.getItem('nnamp_all_users')) || [];
  if(allUsers.find(u => u.phone === phone)) return showAlert("Error ❌", "Phone already registered", "error");

  let newUser = {name, phone, password, balance: 0, totalEarned: 0, lockedBonus: 1000,
                 hasInvested: false, referredBy: referredBy, bank: "", accountNumber: "", accountName: ""};

  allUsers.push(newUser);
  localStorage.setItem('nnamp_all_users', JSON.stringify(allUsers));
  localStorage.setItem('nnamp_user', JSON.stringify(newUser));
  user = newUser;
  showAlert("Success ✅", "Registration Successful!", "success");
  setTimeout(() => window.location.href = "dashboard.html", 1500);
}

// ============ DEPOSIT ============
function deposit() {
  let amount = parseFloat(document.getElementById('depositAmount').value);
  let proof = document.getElementById('proof').files[0];
  if(!amount || amount < 3000) { showAlert("Error ❌", "Minimum deposit is ₦3,000", "error"); return; }
  if(!proof) { showAlert("Error ❌", "Please upload proof of payment", "error"); return; }
  if(!user.phone) { showAlert("Error ❌", "Please login first", "error"); return; }

  let userTx = getTx(user.phone);
  userTx.unshift({id: Date.now(), type: "Deposit via Bank Transfer", amount: amount, status: "Pending", proof: proof.name, date: new Date().toLocaleString()});
  saveTx(user.phone, userTx);
  showAlert("Submitted ⏳", `Deposit of ₦${amount.toLocaleString()} submitted!\n\nStatus: Pending`, "info");
  document.getElementById('depositAmount').value = '';
  document.getElementById('proof').value = '';
  if(typeof loadDepositHistory === 'function') loadDepositHistory();
}

// ============ ADMIN FUNCTIONS ============
function approveDeposit(userPhone, transactionId) {
  let userTx = getTx(userPhone);
  let allUsers = JSON.parse(localStorage.getItem('nnamp_all_users')) || [];
  let userIndex = allUsers.findIndex(u => u.phone === userPhone);
  if(userIndex === -1) return showAlert("Error ❌", "User not found", "error");

  let tx = userTx.find(t => t.id === transactionId);
  if(tx && tx.status === "Pending") {
    tx.status = "Completed";
    allUsers[userIndex].balance += tx.amount;
    checkFirstInvestment(userPhone, tx.amount, allUsers);
    saveTx(userPhone, userTx);
    localStorage.setItem('nnamp_all_users', JSON.stringify(allUsers));
    addNotification(userPhone, `✅ Your deposit of ₦${tx.amount.toLocaleString()} has been approved!`);
    showAlert("Success ✅", "Deposit Approved and User Credited!", "success");
    if(typeof loadPendingDeposits === 'function') loadPendingDeposits();
    if(typeof updateDashboardStats === 'function') updateDashboardStats();
  }
}

function rejectDeposit(userPhone, transactionId) {
  let userTx = getTx(userPhone);
  let tx = userTx.find(t => t.id === transactionId);
  if(tx && tx.status === "Pending") {
    tx.status = "Rejected";
    saveTx(userPhone, userTx);
    addNotification(userPhone, `❌ Your deposit of ₦${tx.amount.toLocaleString()} was rejected.`);
    showAlert("Rejected ❌", "Deposit Rejected", "error");
    if(typeof loadPendingDeposits === 'function') loadPendingDeposits();
  }
}

function approveWithdrawal(userPhone, transactionId) {
  let userTx = getTx(userPhone);
  let allUsers = JSON.parse(localStorage.getItem('nnamp_all_users')) || [];
  let userIndex = allUsers.findIndex(u => u.phone === userPhone);
  if(userIndex === -1) return showAlert("Error ❌", "User not found", "error");

  let tx = userTx.find(t => t.id === transactionId);
  if(tx && tx.status === "Pending") {
    if(allUsers[userIndex].balance < tx.amount) return showAlert("Error ❌", "Insufficient balance", "error");
    tx.status = "Completed";
    allUsers[userIndex].balance -= tx.amount;
    saveTx(userPhone, userTx);
    localStorage.setItem('nnamp_all_users', JSON.stringify(allUsers));
    addNotification(userPhone, `✅ Your withdrawal of ₦${tx.amount.toLocaleString()} has been approved and sent!`);
    showAlert("Success ✅", "Withdrawal Approved!", "success");
    if(typeof loadPendingWithdrawals === 'function') loadPendingWithdrawals();
    if(typeof updateDashboardStats === 'function') updateDashboardStats();
  }
}

function rejectWithdrawal(userPhone, transactionId) {
  let userTx = getTx(userPhone);
  let tx = userTx.find(t => t.id === transactionId);
  if(tx && tx.status === "Pending") {
    tx.status = "Rejected";
    saveTx(userPhone, userTx);
    addNotification(userPhone, `❌ Your withdrawal of ₦${tx.amount.toLocaleString()} was rejected.`);
    showAlert("Rejected ❌", "Withdrawal Rejected", "error");
    if(typeof loadPendingWithdrawals === 'function') loadPendingWithdrawals();
  }
}

function checkFirstInvestment(userPhone, amount, allUsers) {
  let u = allUsers.find(u => u.phone === userPhone);
  if(!u ||!u.referredBy) return;
  let userTx = getTx(userPhone);
  let completedDeposits = userTx.filter(t => t.type.includes("Deposit") && t.status === "Completed");
  if(completedDeposits.length === 1) { giveReferralBonus(u.referredBy, amount, allUsers); }
}

function giveReferralBonus(referrerPhone, investmentAmount, allUsers) {
  let referrerIndex = allUsers.findIndex(u => u.phone === referrerPhone);
  if(referrerIndex!== -1) {
    let bonus = (investmentAmount * REFERRAL_PERCENT) / 100;
    allUsers[referrerIndex].totalEarned += bonus;
    allUsers[referrerIndex].balance += bonus;
    let refTx = getTx(referrerPhone);
    refTx.unshift({id: Date.now(), type: "Referral Bonus 15%", amount: bonus, status: "Completed", date: new Date().toLocaleString()});
    saveTx(referrerPhone, refTx);
    addNotification(referrerPhone, `🎉 You earned ₦${bonus.toLocaleString()} referral bonus!`);
  }
}

function unlockBonus() {
  if(user.lockedBonus > 0 && user.hasInvested === false) {
    user.balance += user.lockedBonus; user.lockedBonus = 0; user.hasInvested = true;
    let userTx = getTx(user.phone);
    userTx.unshift({id: Date.now(), type: "Welcome Bonus", amount: 1000, status: "Completed", date: new Date().toLocaleString()});
    saveTx(user.phone, userTx); saveUser();
    showAlert("Bonus Unlocked 🎉", "Your ₦1000 Welcome Bonus has been unlocked!", "success");
  }
}
function logoutUser() {
    showAlert("Logged Out 👋", "You have been logged out successfully", "info");

    setTimeout(function(){
        localStorage.removeItem('nnampCurrentUser'); // THIS CLEARS LOGIN
        window.location.href = "login.html";
    }, 1500);
}