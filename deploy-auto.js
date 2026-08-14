const VERCEL_DEPLOY_HOOK_URL = "https://api.vercel.com/v1/integrations/deploy/prj_D53ES3R840jEqf69AV1yzN85psS2/X3es7YxJfk";

async function triggerAutoDeploy() {
  console.log("🚀 Vercel 100% 자동 재배포 트리거 요청 중...");
  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
    const json = await res.json();
    if (res.status === 201 || res.status === 200) {
      console.log("✅ Vercel 자동 재배포 성공! (https://365megastarmoon.vercel.app)");
      console.log("Job Status:", json);
    } else {
      console.warn("⚠️ Vercel 배포 응답:", res.status, json);
    }
  } catch (e) {
    console.error("❌ 자동 배포 오류:", e);
  }
}

if (require.main === module) {
  triggerAutoDeploy();
}

module.exports = { triggerAutoDeploy };
