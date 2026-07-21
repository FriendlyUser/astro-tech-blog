const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/mermaid.core.CBK8UolV.js","_astro/chunk-Y2CYZVJY.DsF7k-Jl.js","_astro/src.JYMBGpMX.js","_astro/rolldown-runtime.Bh1tDfsg.js","_astro/chunk-WYO6CB5R.DyH5C8kC.js","_astro/chunk-ICXQ74PX.Ci-i949d.js","_astro/dist.CxP-j5Kx.js","_astro/chunk-VAUOI2AC.BwKo5W-z.js","_astro/chunk-HOUHSVGY.B8W8vXMq.js","_astro/chunk-Q4XR5HBZ.BLTsinDU.js","_astro/chunk-7BUUIJ7U.CAhmNhj7.js","_astro/chunk-OGEWGWER.C7pQv3jv.js","_astro/chunk-C7G6YPKG.tUmUmo9l.js","_astro/chunk-ZGVPDNZ5.CJeHgyAm.js","_astro/rough.esm.CSKSodPl.js","_astro/chunk-52WLFC77.mtlSQG18.js","_astro/line.D8U2-duD.js","_astro/path.BWPyau1x.js","_astro/array.BifhSqXX.js","_astro/chunk-FWX5IMBZ.C5WcoJ2w.js","_astro/chunk-ZIRB5QZD.Dh20_f-h.js"])))=>i.map(i=>d[i]);
var e=(function(){let e=typeof document<`u`&&document.createElement(`link`).relList;return e&&e.supports&&e.supports(`modulepreload`)?`modulepreload`:`preload`})(),t=function(e){return`/`+e},n={},r=function(r,i,a){let o=Promise.resolve();if(i&&i.length>0){let r=document.getElementsByTagName(`link`),s=document.querySelector(`meta[property=csp-nonce]`),c=s?.nonce||s?.getAttribute(`nonce`);function l(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function u(e){return import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href}o=l(i.map(i=>{if(i=t(i,a),i=u(i),i in n)return;n[i]=!0;let o=i.endsWith(`.css`);for(let e=r.length-1;e>=0;e--){let t=r[e];if(t.href===i&&(!o||t.rel===`stylesheet`))return}let s=document.createElement(`link`);if(s.rel=o?`stylesheet`:e,o||(s.as=`script`),s.crossOrigin=``,s.href=i,c&&s.setAttribute(`nonce`,c),document.head.appendChild(s),o)return new Promise((e,t)=>{s.addEventListener(`load`,e),s.addEventListener(`error`,()=>t(Error(`Unable to preload CSS for ${i}`)))})}))}function s(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return o.then(e=>{for(let t of e||[])t.status===`rejected`&&s(t.reason);return r().catch(s)})},i=(...e)=>console.log(`[astro-mermaid]`,...e),a=(...e)=>console.error(`[astro-mermaid]`,...e),o=()=>document.querySelectorAll(`pre.mermaid`).length>0,s=null;async function c(){return s||(i(`Loading mermaid.js...`),s=r(async()=>{let{default:e}=await import(`./mermaid.core.CBK8UolV.js`);return{default:e}},__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20])).then(async({default:e})=>{let t=[];if(t&&t.length>0){i(`Registering`,t.length,`icon packs`);let n=t.map(e=>e.icons?{name:e.name,icons:e.icons}:{name:e.name,loader:()=>fetch(e.url).then(e=>e.json())});await e.registerIconPacks(n)}return e}).catch(e=>{throw a(`Failed to load mermaid:`,e),s=null,e}),s)}var l={startOnLoad:!1,theme:`forest`},u={light:`default`,dark:`dark`};async function d(){i(`Initializing mermaid diagrams...`);let e=document.querySelectorAll(`pre.mermaid`);if(i(`Found`,e.length,`mermaid diagrams`),e.length===0)return;let t=await c(),n=l.theme;{let e=document.documentElement.getAttribute(`data-theme`),t=document.body.getAttribute(`data-theme`);n=u[e||t]||l.theme,i(`Using theme:`,n,`from`,e?`html`:`body`)}t.initialize({...l,theme:n,gitGraph:{mainBranchName:`main`,showCommitLabel:!0,showBranches:!0,rotateCommitLabel:!0}});for(let n of e){if(n.hasAttribute(`data-processed`))continue;n.hasAttribute(`data-diagram`)||n.setAttribute(`data-diagram`,n.textContent||``);let e=n.getAttribute(`data-diagram`)||``,r=`mermaid-`+Math.random().toString(36).slice(2,11);i(`Rendering diagram:`,r);try{let a=document.getElementById(r);a&&a.remove();let{svg:o}=await t.render(r,e);n.innerHTML=o,n.setAttribute(`data-processed`,`true`),i(`Successfully rendered diagram:`,r)}catch(e){a(`Mermaid rendering error for diagram:`,r,e);let t=document.createElement(`div`);t.style.cssText=`color: red; padding: 1rem; border: 1px solid red; border-radius: 0.5rem;`;let i=document.createElement(`strong`);i.textContent=`Error rendering diagram:`;let o=document.createElement(`span`);o.textContent=` `+(e.message||`Unknown error`),t.appendChild(i),t.appendChild(o),n.textContent=``,n.appendChild(t),n.setAttribute(`data-processed`,`true`)}}}o()?(i(`Mermaid diagrams detected on initial load`),d()):i(`No mermaid diagrams found on initial load`);{let e=new MutationObserver(e=>{for(let t of e)t.type===`attributes`&&t.attributeName===`data-theme`&&(document.querySelectorAll(`pre.mermaid[data-processed]`).forEach(e=>{e.removeAttribute(`data-processed`)}),d())});e.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-theme`]}),e.observe(document.body,{attributes:!0,attributeFilter:[`data-theme`]})}document.addEventListener(`astro:after-swap`,()=>{i(`View transition detected`),o()&&d()});var f=document.createElement(`style`);f.textContent=`
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
          `,document.head.appendChild(f);export{r as t};