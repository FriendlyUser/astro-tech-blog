const A=(function(){const a=typeof document<"u"&&document.createElement("link").relList;return a&&a.supports&&a.supports("modulepreload")?"modulepreload":"preload"})(),C=function(e){return"/"+e},b={},S=function(a,i,t){let m=Promise.resolve();if(i&&i.length>0){let h=function(o){return Promise.all(o.map(l=>Promise.resolve(l).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),r=n?.nonce||n?.getAttribute("nonce");m=h(i.map(o=>{if(o=C(o),o in b)return;b[o]=!0;const l=o.endsWith(".css"),u=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${o}"]${u}`))return;const c=document.createElement("link");if(c.rel=l?"stylesheet":A,l||(c.as="script"),c.crossOrigin="",c.href=o,r&&c.setAttribute("nonce",r),document.head.appendChild(c),l)return new Promise((E,w)=>{c.addEventListener("load",E),c.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${o}`)))})}))}function s(n){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=n,window.dispatchEvent(r),!r.defaultPrevented)throw n}return m.then(n=>{for(const r of n||[])r.status==="rejected"&&s(r.reason);return a().catch(s)})},d=(...e)=>console.log("[astro-mermaid]",...e),y=(...e)=>console.error("[astro-mermaid]",...e),k=()=>document.querySelectorAll("pre.mermaid").length>0;let g=null;async function L(){return g||(d("Loading mermaid.js..."),g=S(()=>import("./mermaid.core.DTcXGTUp.js").then(e=>e.bq),[]).then(async({default:e})=>{const a=[];if(a&&a.length>0){d("Registering",a.length,"icon packs");const i=a.map(t=>t.icons?{name:t.name,icons:t.icons}:{name:t.name,loader:()=>fetch(t.url).then(m=>m.json())});await e.registerIconPacks(i)}return e}).catch(e=>{throw y("Failed to load mermaid:",e),g=null,e}),g)}const p={startOnLoad:!1,theme:"forest"},P={light:"default",dark:"dark"};async function f(){d("Initializing mermaid diagrams...");const e=document.querySelectorAll("pre.mermaid");if(d("Found",e.length,"mermaid diagrams"),e.length===0)return;const a=await L();let i=p.theme;{const t=document.documentElement.getAttribute("data-theme"),m=document.body.getAttribute("data-theme");i=P[t||m]||p.theme,d("Using theme:",i,"from",t?"html":"body")}a.initialize({...p,theme:i,gitGraph:{mainBranchName:"main",showCommitLabel:!0,showBranches:!0,rotateCommitLabel:!0}});for(const t of e){if(t.hasAttribute("data-processed"))continue;t.hasAttribute("data-diagram")||t.setAttribute("data-diagram",t.textContent||"");const m=t.getAttribute("data-diagram")||"",s="mermaid-"+Math.random().toString(36).slice(2,11);d("Rendering diagram:",s);try{const n=document.getElementById(s);n&&n.remove();const{svg:r}=await a.render(s,m);t.innerHTML=r,t.setAttribute("data-processed","true"),d("Successfully rendered diagram:",s)}catch(n){y("Mermaid rendering error for diagram:",s,n);const r=document.createElement("div");r.style.cssText="color: red; padding: 1rem; border: 1px solid red; border-radius: 0.5rem;";const h=document.createElement("strong");h.textContent="Error rendering diagram:";const o=document.createElement("span");o.textContent=" "+(n.message||"Unknown error"),r.appendChild(h),r.appendChild(o),t.textContent="",t.appendChild(r),t.setAttribute("data-processed","true")}}}k()?(d("Mermaid diagrams detected on initial load"),f()):d("No mermaid diagrams found on initial load");{const e=new MutationObserver(a=>{for(const i of a)i.type==="attributes"&&i.attributeName==="data-theme"&&(document.querySelectorAll("pre.mermaid[data-processed]").forEach(t=>{t.removeAttribute("data-processed")}),f())});e.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),e.observe(document.body,{attributes:!0,attributeFilter:["data-theme"]})}document.addEventListener("astro:after-swap",()=>{d("View transition detected"),k()&&f()});const v=document.createElement("style");v.textContent=`
            /* Prevent layout shifts by setting minimum height */
            pre.mermaid {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 2rem 0;
              padding: 1rem;
              background-color: transparent;
              border: none;
              overflow: auto;
              min-height: 200px; /* Prevent layout shift */
              position: relative;
            }
            
            /* Loading state with skeleton loader */
            pre.mermaid:not([data-processed]) {
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
            }
            
            /* Dark mode skeleton loader */
            [data-theme="dark"] pre.mermaid:not([data-processed]) {
              background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
              background-size: 200% 100%;
            }
            
            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            
            /* Show processed diagrams with smooth transition */
            pre.mermaid[data-processed] {
              animation: none;
              background: transparent;
              min-height: auto; /* Allow natural height after render */
            }
            
            /* Ensure responsive sizing for mermaid SVGs */
            pre.mermaid svg {
              max-width: 100%;
              height: auto;
            }
            
            /* Optional: Add subtle background for better visibility */
            @media (prefers-color-scheme: dark) {
              pre.mermaid[data-processed] {
                background-color: rgba(255, 255, 255, 0.02);
                border-radius: 0.5rem;
              }
            }
            
            @media (prefers-color-scheme: light) {
              pre.mermaid[data-processed] {
                background-color: rgba(0, 0, 0, 0.02);
                border-radius: 0.5rem;
              }
            }
            
            /* Respect user's color scheme preference */
            [data-theme="dark"] pre.mermaid[data-processed] {
              background-color: rgba(255, 255, 255, 0.02);
              border-radius: 0.5rem;
            }
            
            [data-theme="light"] pre.mermaid[data-processed] {
              background-color: rgba(0, 0, 0, 0.02);
              border-radius: 0.5rem;
            }
          `;document.head.appendChild(v);export{S as _};
