export const THEME_STORAGE_KEY = "lendit-theme";

/**
 * Runs in <head> before first paint so a dark-mode user never sees a white flash.
 * Printed loan slips always stay light.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"light";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(location.pathname.indexOf("/print")===0)d=false;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
