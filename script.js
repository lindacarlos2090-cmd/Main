const car=document.querySelector('#car'), pickup=document.querySelector('#pickup'), ret=document.querySelector('#return'), result=document.querySelector('#bookingResult');
const today=new Date().toISOString().slice(0,10);pickup.min=today;ret.min=today;document.querySelector('#year').textContent=new Date().getFullYear();
const modal=document.querySelector('#modal');

const FN = '/.netlify/functions';
let rates = {};  // filled in once the fleet loads - never hardcoded, so dashboard price changes show up immediately

// Swaps the big preview image/video on a car card when a thumbnail is clicked.
window.__showCarMedia = function(mainId, thumbEl, src, isVideo){
  const mediaBox = document.getElementById(mainId).parentElement;
  mediaBox.innerHTML = isVideo
    ? `<video id="${mainId}" src="${src}" controls autoplay playsinline></video>`
    : `<img id="${mainId}" src="${src}" alt="">`;
  thumbEl.parentElement.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
};

// Shown when the fleet database can't be reached, so the cars and their photos
// still appear. Mirrors supabase/fleet-update.sql.
const FALLBACK_FLEET = [
  { id: 'cx5-black', name: 'Mazda CX-5 (Black)', daily_rate: 7000, seats: 5, transmission: 'Automatic', fuel: 'Petrol',
    photos: ['assets/cx5-black-1.jpg', 'assets/cx5-black-2.jpg', 'assets/cx5-black-3.jpg'], video_url: 'assets/cx5-black-video.mp4' },
  { id: 'cx5-white', name: 'Mazda CX-5 (White)', daily_rate: 7000, seats: 5, transmission: 'Automatic', fuel: 'Petrol',
    photos: ['assets/cx5-white-1.jpg', 'assets/cx5-white-2.jpg', 'assets/cx5-white-3.jpg'] },
  { id: 'prado-tx', name: 'Toyota Prado TX', daily_rate: 12000, seats: 5, transmission: 'Automatic', fuel: 'Petrol',
    photos: ['assets/tx.jpg'] },
];

// photos may arrive as an array or as a JSON string, depending on how the row was saved.
function carPhotos(c){
  let list = c.photos;
  if(typeof list === 'string'){ try{ list = JSON.parse(list); }catch(e){ list = [list]; } }
  list = (Array.isArray(list) ? list : []).filter(Boolean);
  if(!list.length && c.photo_url) list = [c.photo_url];
  return list.length ? list : ['assets/logo.jpg'];
}

function days(a,b){return Math.max(1,Math.ceil((new Date(b)-new Date(a))/86400000))}
function format(n){return 'KSh '+n.toLocaleString()}

async function loadFleet(){
  const grid = document.querySelector('#carGrid');
  let fleet = [];
  try{
    const res = await fetch(`${FN}/get-fleet`);
    const data = await res.json();
    fleet = data.fleet || [];
  }catch(err){
    console.warn('Fleet could not be loaded, showing built-in list instead', err);
  }
  if(!fleet.length) fleet = FALLBACK_FLEET;

  rates = {};
  car.innerHTML = '<option value="">Select vehicle</option>';
  grid.innerHTML = '';

  fleet.forEach(c => {
    rates[c.name] = c.daily_rate;
    car.innerHTML += `<option value="${c.name}">${c.name}</option>`;

    const photos = carPhotos(c);
    const mainId = `main-${c.id}`;
    const thumbs = photos.map((p, i) =>
      `<img src="${p}" class="thumb${i===0?' active':''}" data-src="${p}" onclick="window.__showCarMedia('${mainId}', this, '${p}', false)">`
    ).join('');
    const videoThumb = c.video_url
      ? `<div class="thumb video-thumb" onclick="window.__showCarMedia('${mainId}', this, '${c.video_url}', true)">▶</div>`
      : '';

    grid.innerHTML += `
      <article class="car-card">
        <div class="car-media">
          <img id="${mainId}" src="${photos[0]}" alt="${c.name}" onerror="this.onerror=null;this.src='assets/logo.jpg'">
        </div>
        <div class="thumb-row">${thumbs}${videoThumb}</div>
        <div class="car-info">
          <h3>${c.name}</h3>
          <div class="specs"><span>${c.seats} seats</span><span>${c.transmission}</span><span>${c.fuel}</span></div>
          <button class="btn primary select-car" data-car="${c.name}">Book This Car</button>
        </div>
      </article>`;
  });

  document.querySelectorAll('.select-car').forEach(btn=>btn.onclick=()=>{
    car.value=btn.dataset.car;
    document.querySelector('#booking').scrollIntoView({behavior:'smooth'});
  });
}
loadFleet();

async function checkAvailability(c,a,b){
  const res = await fetch(`${FN}/check-availability`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({car:c, pickup:a, return:b})
  });
  if(!res.ok) throw new Error('Could not check availability right now.');
  return (await res.json()).available;
}

function openPayment(c,a,b){
  const d=days(a,b), total=d*rates[c];
  modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
  document.querySelector('#modalContent').innerHTML =
    `<p class="eyebrow">Secure booking</p><h2>Complete your reservation</h2>
     <div class="payment-summary"><b>${c}</b><br>${a} to ${b}<br><b>${d} day${d>1?'s':''}, total ${format(total)}</b></div>
     <form class="payment-form" id="payForm">
       <input id="customerName" placeholder="Full name" required>
       <input id="phone" placeholder="M-Pesa number e.g. 254743113313" required pattern="2547[0-9]{8}">
       <button class="btn primary" type="submit">Pay ${format(total)} via M-Pesa</button>
       <p class="notice" id="payNotice">You'll get an M-Pesa prompt on your phone to approve the payment.</p>
     </form>`;

  document.querySelector('#payForm').onsubmit = async e => {
    e.preventDefault();
    const name = document.querySelector('#customerName').value;
    const phone = document.querySelector('#phone').value;
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true; submitBtn.textContent = 'Booking...';

    try {
      const createRes = await fetch(`${FN}/create-booking`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({car:c, name, phone, pickup:a, return:b})
      });
      const created = await createRes.json();
      if(!createRes.ok) throw new Error(created.error || 'Could not create booking.');

      submitBtn.textContent = 'Sending M-Pesa prompt...';
      const stkRes = await fetch(`${FN}/mpesa-stkpush`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({bookingId: created.bookingId})
      });
      const stk = await stkRes.json();
      if(!stkRes.ok) throw new Error(stk.error || 'Could not start M-Pesa payment.');

      document.querySelector('#modalContent').innerHTML =
        `<p class="eyebrow">Check your phone</p><h2>Approve the M-Pesa prompt</h2>
         <p>An STK push was sent to <b>${phone}</b> for <b>${format(total)}</b>. Enter your M-Pesa PIN on your phone to confirm.</p>
         <p class="notice" id="statusText">Waiting for confirmation...</p>`;

      const bookingId = created.bookingId;
      const poll = setInterval(async () => {
        const statusRes = await fetch(`${FN}/booking-status?bookingId=${bookingId}`);
        const { status } = await statusRes.json();
        if (status === 'paid') {
          clearInterval(poll);
          document.querySelector('#modalContent').innerHTML =
            `<p class="eyebrow">Booking confirmed</p><h2>Thank you, ${name.split(' ')[0]}.</h2>
             <p>Your <b>${c}</b> has been reserved from <b>${a}</b> to <b>${b}</b>.</p>
             <div class="payment-summary">Total: <b>${format(total)}</b><br>Payment status: <b>Paid via M-Pesa</b></div>`;
        } else if (status === 'failed') {
          clearInterval(poll);
          document.querySelector('#statusText').textContent = 'Payment was not completed. Please try again.';
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);

    } catch (err) {
      document.querySelector('#payNotice').textContent = err.message;
      submitBtn.disabled = false; submitBtn.textContent = `Pay ${format(total)} via M-Pesa`;
    }
  };
}

document.querySelector('#bookingForm').addEventListener('submit', async e => {
  e.preventDefault();
  if(!car.value||!pickup.value||!ret.value) return;
  if(ret.value<=pickup.value){ result.innerHTML='<div class="result-bad">Return date must be after the pick-up date.</div>'; return; }

  result.innerHTML = '<div>Checking availability...</div>';
  let ok;
  try { ok = await checkAvailability(car.value, pickup.value, ret.value); }
  catch(err){ result.innerHTML = `<div class="result-bad">${err.message}</div>`; return; }

  if(!ok){ result.innerHTML='<div class="result-bad">Sorry, this vehicle is already booked for some of those dates. Please choose different dates.</div>'; return; }

  const d=days(pickup.value,ret.value), total=d*rates[car.value];
  result.innerHTML = `<div class="result-ok"><b>Great — ${car.value} is available.</b> ${d} day${d>1?'s':''} × ${format(rates[car.value])} = <b>${format(total)}</b><br><button class="btn primary" style="margin-top:10px" id="continuePay">Continue to M-Pesa Payment</button></div>`;
  document.querySelector('#continuePay').onclick = () => openPayment(car.value, pickup.value, ret.value);
});

document.querySelector('#closeModal').onclick=()=>modal.classList.remove('show');
modal.onclick=e=>{if(e.target===modal)modal.classList.remove('show')};
