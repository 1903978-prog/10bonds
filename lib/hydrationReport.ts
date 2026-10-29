// Diagnosis of the intermittent React error #418 on the live site (29/10/2026). The minified production build only says "HTML didn't match".
// This script keeps the server's page as it arrived (at DOMContentLoaded) and, when React reports #418, #423 or #425, writes ONE console line
// naming the first element or text that differs between that page and what the browser drew afterwards. Read-only, sends nothing anywhere.
// Remove it again once the cause is fixed.
export const HYDRATION_REPORT = `(function(){
var snap=null;
function tokens(root){var t=[];(function w(n,d){for(var c=n.firstChild;c;c=c.nextSibling){if(c.nodeType===1){var tag=c.tagName.toLowerCase();if(tag==="script"||tag==="next-route-announcer"||c.hasAttribute("data-cookie-banner"))continue;t.push("<"+tag+(c.id?"#"+c.id:"")+">");w(c,d+1)}else if(c.nodeType===3){var x=c.nodeValue.replace(/\\s+/g," ").trim();if(x)t.push("'"+x.slice(0,80)+"'")}}})(root,0);return t}
function heads(){var t=[];var h=document.head;for(var c=h.firstChild;c;c=c.nextSibling){if(c.nodeType!==1)continue;var tag=c.tagName.toLowerCase();if(tag==="script")continue;t.push(tag+":"+(c.getAttribute("name")||c.getAttribute("property")||c.getAttribute("rel")||c.getAttribute("charset")||(tag==="title"?c.textContent:"")))}return t}
document.addEventListener("DOMContentLoaded",function(){if(document.body)snap={b:tokens(document.body),h:heads()}});
window.addEventListener("error",function(e){var m=String(e&&e.message||"");if(!/#4(18|23|25)/.test(m))return;
setTimeout(function(){try{if(!snap){console.error("[hydration-diff] no snapshot");return}
var b=tokens(document.body),i=0;while(i<snap.b.length&&i<b.length&&snap.b[i]===b[i])i++;
var hh=heads(),j=0;while(j<snap.h.length&&j<hh.length&&snap.h[j]===hh[j])j++;
console.error("[hydration-diff] body at "+i+"/"+snap.b.length+" server="+JSON.stringify(snap.b.slice(Math.max(0,i-2),i+3))+" client="+JSON.stringify(b.slice(Math.max(0,i-2),i+3))+" | head at "+j+"/"+snap.h.length+" server="+JSON.stringify(snap.h.slice(j,j+3))+" client="+JSON.stringify(hh.slice(j,j+3)))}catch(x){console.error("[hydration-diff] failed "+x)}},1500)})
})();`;
