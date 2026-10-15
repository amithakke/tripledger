const CATEGORIES = [
  {name:"Flights & trains",icon:"✈️"},{name:"Accommodation",icon:"🛏️"},{name:"Restaurant & food",icon:"🍜"},
  {name:"Local transport",icon:"🚕"},{name:"Tickets & activities",icon:"🎟️"},{name:"Shopping",icon:"🛍️"},
  {name:"Visa & travel fees",icon:"🛂"},{name:"Travel insurance",icon:"🛡️"},{name:"Fuel & parking",icon:"⛽"},
  {name:"Tips & service charges",icon:"🪙"},{name:"Connectivity",icon:"📶"},{name:"Other",icon:"✦"}
];
const STORE_KEY="tripledger-expenses-v1";
const BUDGET_KEY="tripledger-trip-budget-v1";
const TRIP_KEY="tripledger-trip-details-v1";
let expenses=[];
let tripBudget=0;
let tripDestination="", tripStartDate="", tripEndDate="";
let apiAvailable=false;
function loadLocalState(){
  try { expenses=JSON.parse(localStorage.getItem(STORE_KEY)||"[]"); } catch(e){ expenses=[]; }
  try { tripBudget=Number(localStorage.getItem(BUDGET_KEY)||0); } catch(e){ tripBudget=0; }
  try { const trip=JSON.parse(localStorage.getItem(TRIP_KEY)||"{}"); tripDestination=trip.destination||""; tripStartDate=trip.startDate||""; tripEndDate=trip.endDate||""; } catch(e) {}
}
async function loadState(){
  loadLocalState();
  try {
    const response=await fetch("/api/state");
    if(!response.ok) throw new Error("API unavailable");
    const state=await response.json();
    expenses=Array.isArray(state.expenses)?state.expenses:[];
    tripBudget=Number(state.tripBudget)||0;
    tripDestination=state.tripDestination||"";
    tripStartDate=state.tripStartDate||"";
    tripEndDate=state.tripEndDate||"";
    apiAvailable=true;
    saveLocalOnly();
  } catch(e) { apiAvailable=false; }
}
function saveLocalOnly(){
  try {
    localStorage.setItem(STORE_KEY,JSON.stringify(expenses));
    localStorage.setItem(BUDGET_KEY,String(tripBudget));
    localStorage.setItem(TRIP_KEY,JSON.stringify({destination:tripDestination,startDate:tripStartDate,endDate:tripEndDate}));
  } catch(e) {}
}
async function save(){
  saveLocalOnly();
  if(apiAvailable){
    try {
      await fetch("/api/state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({expenses,tripBudget,tripDestination,tripStartDate,tripEndDate})});
    } catch(e) { console.warn("Could not sync with backend; local copy is retained."); }
  }
}
let editingId=null;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const iconFor=cat=>(CATEGORIES.find(c=>c.name===cat)||{icon:"✦"}).icon;
const fmtDate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—";
function init(){
 $("todayDate").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
 $("date").value=new Date().toISOString().slice(0,10);
 $("category").innerHTML=CATEGORIES.map(c=>`<option>${c.name}</option>`).join("");
 $("categoryFilter").innerHTML='<option value="">All categories</option>'+CATEGORIES.map(c=>`<option>${c.name}</option>`).join("");
 $("category").value="Flights & trains";
 render();
}
function render(){
 const total=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
 const budget=Number(tripBudget)||0, remaining=budget-total, days=new Set(expenses.map(e=>e.date)).size;
 $("totalSpend").textContent=money(total); $("remaining").textContent=money(remaining);
 $("remainingNote").textContent=remaining>=0?"Available for the rest of your trip":"You are over budget";
 $("dailyAverage").textContent=money(days?total/days:0); $("transactionCount").textContent=expenses.length;
 $("heroBudget").textContent=money(budget); $("heroSpent").textContent=money(total)+" spent"; $("heroRemaining").textContent=budget>0?money(remaining)+" left":"Set a budget to see balance";
 $("heroProgress").style.width=budget>0?Math.min(100,total/budget*100)+"%":"0%";
 $("tripCount").textContent=expenses.length+" expenses logged";
 $("tripBudgetInput").value=tripBudget>0?tripBudget:"";
 $("destinationInput").value=tripDestination;
 $("startDateInput").value=tripStartDate;
 $("endDateInput").value=tripEndDate;
 $("tripDestination").textContent=tripDestination||"Add your destination";
 $("tripDates").textContent=(tripStartDate?fmtDate(tripStartDate):"Departure date not set")+" — "+(tripEndDate?fmtDate(tripEndDate):"Return date not set");
 if(tripStartDate&&tripEndDate){
   const days=Math.max(1,Math.round((new Date(tripEndDate+"T12:00:00")-new Date(tripStartDate+"T12:00:00"))/86400000)+1);
   $("tripDays").textContent=days+" day"+(days===1?"":"s");
 }else{$("tripDays").textContent="Dates not set";}
 if(!expenses.length){
   $("spendingChart").innerHTML='<div class="empty" style="width:100%">No expenses yet. Add your first ticket, meal, or travel charge to start tracking.</div>';
   $("categoryList").innerHTML='<div class="empty">Your expense categories will appear here after you add expenses.</div>';
 }
 if(expenses.length){renderChart(); renderCategories();}
 renderRows();
 if($("view-spend") && $("view-spend").classList.contains("active"))renderSpendPage();
}
function renderChart(){
 const count=Number($("chartRange").value)||7;
 const dates=[...new Set(expenses.map(e=>e.date))].sort().slice(-count);
 if(!dates.length){$("spendingChart").innerHTML='<div class="empty">Add expenses to see your spending chart.</div>';return;}
 const values=dates.map(d=>expenses.filter(e=>e.date===d).reduce((s,e)=>s+Number(e.amount),0));
 const max=Math.max(...values,1);
 $("spendingChart").innerHTML=dates.map((d,i)=>`<div class="bar-wrap" title="${fmtDate(d)}: ${money(values[i])}"><div class="bar ${i===values.length-1?'highlight':''}" style="height:${Math.max(4,values[i]/max*145)}px"></div><div class="bar-label">${new Date(d+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div></div>`).join("");
}
function renderCategories(){
 const totals=CATEGORIES.map(c=>({...c,total:expenses.filter(e=>e.category===c.name).reduce((s,e)=>s+Number(e.amount),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
 const sum=totals.reduce((s,c)=>s+c.total,0);
 $("categoryList").innerHTML=totals.length?totals.slice(0,6).map(c=>`<div class="cat-row"><div class="cat-icon">${c.icon}</div><div><div class="cat-name">${c.name}</div><div class="cat-desc">${sum?Math.round(c.total/sum*100):0}% of trip spend<div class="mini-track"><span style="width:${sum?c.total/sum*100:0}%"></span></div></div></div><div class="cat-amount">${money(c.total)}</div></div>`).join(""):'<div class="empty">Your category breakdown will appear here.</div>';
}
function renderRows(){
 const q=$("searchInput").value.trim().toLowerCase(), cat=$("categoryFilter").value;
 const filtered=[...expenses].filter(e=>(!cat||e.category===cat)&&(!q||[e.description,e.merchant,e.category,e.payment,e.notes].join(" ").toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
 $("transactionRows").innerHTML=filtered.length?filtered.map(e=>`<tr><td><div class="tx-title">${escapeHtml(e.description)}</div><div class="tx-sub">${escapeHtml(e.merchant||e.notes||"No extra details")}</div></td><td><span class="tx-category">${iconFor(e.category)} ${escapeHtml(e.category)}</span></td><td>${fmtDate(e.date)}</td><td>${escapeHtml(e.payment||"—")}</td><td class="amount">${money(Number(e.amount))}</td><td><button class="delete" data-delete="${e.id}" aria-label="Delete ${escapeHtml(e.description)}">Delete</button></td></tr>`).join(""):'<tr><td class="empty" colspan="6">No expenses found. Add one to get started.</td></tr>';
 document.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>{if(confirm("Delete this expense?")){expenses=expenses.filter(e=>e.id!==Number(btn.dataset.delete));save();render();}}));
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openModal(){editingId=null;$("expenseForm").reset();$("date").value=new Date().toISOString().slice(0,10);$("modalTitle").textContent="Add an expense";$("modalBackdrop").classList.add("show");setTimeout(()=>$("description").focus(),50);}
function closeModal(){$("modalBackdrop").classList.remove("show");}
$("addBtn").addEventListener("click",openModal);$("sideAdd").addEventListener("click",openModal);$("closeModal").addEventListener("click",closeModal);$("cancelModal").addEventListener("click",closeModal);
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
$("expenseForm").addEventListener("submit",e=>{
 e.preventDefault();
 const entry={id:Date.now(),description:$("description").value.trim(),amount:Number($("amount").value),category:$("category").value,date:$("date").value,payment:$("payment").value,merchant:$("merchant").value.trim(),people:$("people").value.trim(),notes:$("notes").value.trim()};
 if(!entry.description||!entry.date||!(entry.amount>0))return;
 expenses.push(entry);save();render();closeModal();
});
$("searchInput").addEventListener("input",renderRows);$("categoryFilter").addEventListener("change",renderRows);$("chartRange").addEventListener("change",()=>{if(expenses.length)renderChart();});
$("saveBudgetBtn").addEventListener("click",()=>{
 const raw=$("tripBudgetInput").value.trim();
 const value=raw===""?0:Number(raw);
 if(!Number.isFinite(value)||value<0){$("budgetSaveStatus").textContent="Enter a valid budget amount.";return;}
 const start=$("startDateInput").value, end=$("endDateInput").value;
 if(start&&end&&end<start){$("budgetSaveStatus").textContent="Return date must be on or after departure date.";return;}
 tripBudget=value;
 tripDestination=$("destinationInput").value.trim();
 tripStartDate=start; tripEndDate=end;
 try{
   localStorage.setItem(BUDGET_KEY,String(tripBudget));
   localStorage.setItem(TRIP_KEY,JSON.stringify({destination:tripDestination,startDate:tripStartDate,endDate:tripEndDate}));
 }catch(e){}
 saveLocalOnly();
 if(apiAvailable){fetch("/api/state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({expenses,tripBudget,tripDestination,tripStartDate,tripEndDate})}).catch(()=>{});}
 $("budgetSaveStatus").textContent="Trip details saved.";
 render();
});
function showDestinationMap(){
 const destination=$("destinationInput").value.trim()||tripDestination;
 if(!destination){$("budgetSaveStatus").textContent="Enter a destination first, such as Goa or Tokyo."; $("destinationInput").focus();return;}
 const q=encodeURIComponent(destination);
 $("mapWrap").style.display="block";
 $("destinationMap").src="https://www.openstreetmap.org/export/embed.html?search="+q;
 $("openMapLink").href="https://www.openstreetmap.org/search?query="+q;
 $("tripDestination").textContent=destination;
 $("mapWrap").scrollIntoView({behavior:"smooth",block:"nearest"});
}
$("showMapBtn").addEventListener("click",showDestinationMap);
function renderSpendPage(){
 const total=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
 $("spendTotal").textContent=money(total);
 $("spendLeft").textContent=money((Number(tripBudget)||0)-total);
 $("spendCount").textContent=expenses.length;
 const selected=$("spendCategoryFilter").value;
 const q=$("spendSearch").value.trim().toLowerCase();
 const rows=[...expenses].filter(e=>(!selected||e.category===selected)&&(!q||[e.description,e.merchant,e.category,e.payment,e.notes].join(" ").toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
 $("spendRows").innerHTML=rows.length?rows.map(e=>`<tr><td><div class="tx-title">${escapeHtml(e.description)}</div><div class="tx-sub">${escapeHtml(e.merchant||e.notes||"No extra details")}</div></td><td><span class="tx-category">${iconFor(e.category)} ${escapeHtml(e.category)}</span></td><td>${fmtDate(e.date)}</td><td>${escapeHtml(e.payment||"—")}</td><td class="amount">${money(Number(e.amount))}</td><td><button class="delete" data-spend-delete="${e.id}">Delete</button></td></tr>`).join(""):'<tr><td class="empty" colspan="6">No expenses yet. Click “Add expense” to record your first travel cost.</td></tr>';
 document.querySelectorAll("[data-spend-delete]").forEach(btn=>btn.addEventListener("click",()=>{if(confirm("Delete this expense?")){expenses=expenses.filter(e=>e.id!==Number(btn.dataset.spendDelete));save();render();renderSpendPage();}}));
}
function showPage(page){
 document.querySelectorAll(".page-view").forEach(el=>el.classList.toggle("active",el.id==="view-"+page));
 document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 if(page==="spend")renderSpendPage();
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
$("spendAddBtn").addEventListener("click",openModal);
$("spendSearch").addEventListener("input",renderSpendPage);
$("spendCategoryFilter").innerHTML='<option value="">All categories</option>'+CATEGORIES.map(c=>`<option>${c.name}</option>`).join("");
$("spendCategoryFilter").addEventListener("change",renderSpendPage);
loadState().finally(()=>init());


/* -----------------------------------------------------------
   Ambient travel animation: rotating globe, route arcs, planes
   Drawn on canvas so it stays smooth and sits behind page UI.
------------------------------------------------------------ */
(function initTravelMotion() {
  const canvas = document.getElementById("travel-motion-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0, height = 0, dpr = 1, frame = 0, scrollY = window.scrollY || 0;
  const stars = [];
  const routes = [
    {a: -2.45, b: -0.35, r: .82, phase: .1},
    {a: -2.05, b: .55, r: .72, phase: 2.0},
    {a: -.8, b: 1.6, r: .88, phase: 3.5},
    {a: .3, b: 2.65, r: .77, phase: 1.4},
    {a: 1.1, b: -1.8, r: .68, phase: 4.4}
  ];
  const continents = [
    [[-.78,-.12],[-.62,-.3],[-.45,-.25],[-.37,-.08],[-.48,.08],[-.5,.28],[-.62,.48],[-.72,.24]],
    [[-.28,-.45],[-.12,-.52],[.02,-.39],[-.06,-.18],[-.2,-.14],[-.32,-.26]],
    [[-.16,-.03],[.02,-.1],[.15,.08],[.1,.34],[-.04,.53],[-.18,.3]],
    [[.04,-.42],[.25,-.52],[.48,-.39],[.65,-.2],[.53,-.04],[.34,-.12],[.2,.04],[.03,-.12]],
    [[.3,.04],[.5,.02],[.62,.2],[.53,.4],[.35,.34],[.25,.16]],
    [[.62,-.12],[.79,-.02],[.77,.14],[.62,.13]]
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.length = 0;
    const count = Math.min(130, Math.floor(width * height / 9000));
    for (let i = 0; i < count; i++) {
      stars.push({x: Math.random() * width, y: Math.random() * height, s: Math.random()*1.6+.25, p: Math.random()*Math.PI*2});
    }
  }

  function drawGlobe(t) {
    const radius = Math.min(width * .31, height * .43, 330);
    const cx = width * (width < 700 ? .78 : .79);
    const cy = height * .48 - ((scrollY % Math.max(height, 1)) * .075);
    const rot = t * (reducedMotion ? .000015 : .000075);
    const grad = ctx.createRadialGradient(cx-radius*.35, cy-radius*.42, radius*.04, cx, cy, radius*1.04);
    grad.addColorStop(0, "rgba(18, 108, 133, .56)");
    grad.addColorStop(.55, "rgba(9, 59, 88, .46)");
    grad.addColorStop(1, "rgba(3, 18, 35, .06)");
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.clip();
    ctx.fillStyle = grad; ctx.fillRect(cx-radius, cy-radius, radius*2, radius*2);

    // soft ocean light bands
    for (let i=0;i<6;i++) {
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(rot+i)*radius*.1, cy + (i-2.5)*radius*.28, radius*.94, radius*.11, -.15, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(73, 218, 224, ${.035 + i*.006})`;
      ctx.lineWidth = 1; ctx.stroke();
    }

    // Latitude / longitude grid
    ctx.strokeStyle = "rgba(76, 207, 220, .15)";
    ctx.lineWidth = 1;
    for (let i=-3;i<=3;i++) {
      ctx.beginPath(); ctx.ellipse(cx, cy, radius*.96, radius*(.18+Math.abs(i)*.105), 0, 0, Math.PI*2); ctx.stroke();
    }
    for (let i=0;i<7;i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius*Math.abs(Math.cos(i*Math.PI/7)), radius*.98, rot+i*.23, 0, Math.PI*2);
      ctx.stroke();
    }

    // Stylized continent silhouettes drift across the globe
    continents.forEach((shape, si) => {
      ctx.beginPath();
      shape.forEach((pt, i) => {
        const x = cx + Math.sin(rot + si*.6) * radius*.22 + (pt[0]*radius*1.15);
        const y = cy + pt[1]*radius*1.15;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(38, 172, 143, .13)";
      ctx.fill();
      ctx.strokeStyle = "rgba(86, 230, 193, .26)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    });

    // glowing travel hubs on the globe
    const hubs = [[-.2,-.08],[.1,.04],[.42,-.12],[-.55,.12],[.28,.28]];
    hubs.forEach((p,i)=>{
      const x=cx+p[0]*radius + Math.sin(rot*2+i)*radius*.08;
      const y=cy+p[1]*radius;
      ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);
      ctx.fillStyle="#8df6d5";ctx.shadowColor="#50e9cf";ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;
    });
    ctx.restore();

    // orbital halo
    ctx.beginPath(); ctx.ellipse(cx, cy, radius*1.12, radius*.34, -.25, 0, Math.PI*2);
    ctx.strokeStyle="rgba(78, 220, 224, .24)"; ctx.lineWidth=1.2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, radius*1.19, radius*.42, -.25, .3, Math.PI*1.75);
    ctx.strokeStyle="rgba(56, 174, 219, .18)"; ctx.stroke();

    // route arcs and moving airplane glyphs
    routes.forEach((route,i)=>{
      const startX=cx + Math.cos(route.a+rot)*radius*.88;
      const startY=cy + Math.sin(route.a+rot)*radius*.48;
      const endX=cx + Math.cos(route.b+rot)*radius*.88;
      const endY=cy + Math.sin(route.b+rot)*radius*.48;
      const controlX=(startX+endX)/2 + Math.sin(i+rot*2)*radius*.16;
      const controlY=Math.min(startY,endY)-radius*(.22+route.r*.12);
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.quadraticCurveTo(controlX,controlY,endX,endY);
      ctx.setLineDash([3,7]);ctx.lineDashOffset=-(t*.018+i*8);
      ctx.strokeStyle="rgba(90, 227, 220, .45)";ctx.lineWidth=1.4;ctx.stroke();ctx.setLineDash([]);
      const u=(t*.000045+route.phase)%1;
      const v=1-u;
      const px=v*v*startX+2*v*u*controlX+u*u*endX;
      const py=v*v*startY+2*v*u*controlY+u*u*endY;
      ctx.save();ctx.translate(px,py);ctx.rotate(Math.atan2(2*v*(controlY-startY)+2*u*(endY-controlY),2*v*(controlX-startX)+2*u*(endX-controlX)));
      ctx.fillStyle=i%2?"#a5fff0":"#ffffff";ctx.shadowColor="#52e7df";ctx.shadowBlur=9;
      ctx.font="16px system-ui";ctx.fillText("✈", -7, 5);ctx.restore();
      ctx.beginPath();ctx.arc(startX,startY,2.5,0,Math.PI*2);ctx.fillStyle="#62e7c6";ctx.fill();
      ctx.beginPath();ctx.arc(endX,endY,2.5,0,Math.PI*2);ctx.fillStyle="#62e7c6";ctx.fill();
    });
  }

  function draw(t) {
    ctx.clearRect(0,0,width,height);
    const bg=ctx.createLinearGradient(0,0,width,height);
    bg.addColorStop(0,"#061827");bg.addColorStop(.55,"#092b40");bg.addColorStop(1,"#061827");
    ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);

    stars.forEach(star=>{
      const twinkle=.35+.65*(.5+.5*Math.sin(t*.001+star.p));
      ctx.beginPath();ctx.arc(star.x,star.y,star.s,0,Math.PI*2);
      ctx.fillStyle=`rgba(174, 244, 239, ${twinkle*.7})`;ctx.fill();
    });

    // India-inspired luminous route shape, subtle in the lower-left area
    const ix=width*(width<700?.2:.25), iy=height*.72, sc=Math.min(width*.00024,.22);
    ctx.save();ctx.translate(ix,iy);ctx.scale(sc*1000,sc*1000);
    ctx.beginPath();
    ctx.moveTo(0,-1.1);ctx.lineTo(.28,-.92);ctx.lineTo(.48,-.65);ctx.lineTo(.32,-.38);
    ctx.lineTo(.48,-.12);ctx.lineTo(.32,.12);ctx.lineTo(.15,.45);ctx.lineTo(.03,.85);
    ctx.lineTo(-.15,.55);ctx.lineTo(-.3,.28);ctx.lineTo(-.36,-.02);ctx.lineTo(-.2,-.3);
    ctx.lineTo(-.38,-.56);ctx.lineTo(-.25,-.82);ctx.closePath();
    ctx.fillStyle="rgba(32, 188, 154, .06)";ctx.fill();
    ctx.strokeStyle="rgba(79, 224, 192, .18)";ctx.lineWidth=.012;ctx.stroke();
    ctx.restore();

    drawGlobe(t);
    if (!reducedMotion) frame=requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", ()=>{scrollY=window.scrollY||0; if(reducedMotion) draw(performance.now());},{passive:true});
  resize();
  draw(0);
  if (reducedMotion) return;
  frame=requestAnimationFrame(draw);
})();
