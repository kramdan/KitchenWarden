// Highlights the confirm-password field red while it differs from the password field.
// The server checks the match again on submit, so this is only feedback.
(function () {
  var password = document.getElementById("password");
  var confirm = document.getElementById("confirm_password");
  if (!password || !confirm) {
    return;
  }

  function check() {
    var mismatch = confirm.value !== "" && confirm.value !== password.value;
    confirm.classList.toggle("mismatch", mismatch);
    confirm.setCustomValidity(mismatch ? "Passwords do not match" : "");
  }

  password.addEventListener("input", check);
  confirm.addEventListener("input", check);
})();
