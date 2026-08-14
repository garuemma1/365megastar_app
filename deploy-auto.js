// 💡 Legacy project (365megastar_moon) hook disabled to stop failure emails.
// Production site is https://365megastar-app.vercel.app (connected to GitHub).

async function triggerAutoDeploy() {
  console.log("✅ Vercel Production Site is: https://365megastar-app.vercel.app");
}

if (require.main === module) {
  triggerAutoDeploy();
}

module.exports = { triggerAutoDeploy };
