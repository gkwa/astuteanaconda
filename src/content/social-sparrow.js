// Function to wait for SocialSparrow
export function waitForSocialSparrow(maxAttempts = 15, interval = 1000) {
  console.log("DEBUGGING: Starting waitForSocialSparrow");
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkSocialSparrow = () => {
      attempts++;
      console.log(`DEBUGGING: Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`);

      if (typeof window.SocialSparrow !== "undefined") {
        console.log("DEBUGGING: SocialSparrow API loaded successfully");

        if (typeof window.SocialSparrow.extractProducts === "function") {
          console.log("DEBUGGING: SocialSparrow API methods ready");
          setTimeout(() => resolve(window.SocialSparrow), 500);
        } else {
          console.log("DEBUGGING: SocialSparrow API found but methods not ready yet");
          if (attempts >= maxAttempts) {
            reject(new Error("SocialSparrow API methods not available after maximum attempts"));
          } else {
            setTimeout(checkSocialSparrow, interval);
          }
        }
      } else if (attempts >= maxAttempts) {
        console.error("DEBUGGING: SocialSparrow API failed to load after maximum attempts");
        reject(new Error("SocialSparrow API not available"));
      } else {
        console.log(`DEBUGGING: SocialSparrow not found yet, trying again in ${interval}ms`);
        setTimeout(checkSocialSparrow, interval);
      }
    };

    checkSocialSparrow();
  });
}
