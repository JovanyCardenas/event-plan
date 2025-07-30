const EVENT_ID = "service-day"; // Change depending on what event you want to display

// ================= INITIALIZE =================
const db = window.db;
const auth = window.auth;

if (!db || !auth) {
  console.error("Firebase not initialized: db or auth is missing.");
}

// Firebase imports
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadEvent();
});

// ================= LOGIN =================
async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('auth-status').textContent = "Logged in!";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
}

async function logout() {
  await signOut(auth);
  document.getElementById('auth-status').textContent = "Logged out.";
}

onAuthStateChanged(auth, (user) => {
  const authControls = document.getElementById('auth-controls');
  const editButton = document.getElementById('edit-button');
  const logoutButton = document.getElementById('logout-button');
  const saveButton = document.getElementById('save-button');

  if (user) {
    authControls.classList.add('hidden');
    logoutButton.classList.remove('hidden');

    if (!document.body.classList.contains("cms-enabled")) {
      editButton.classList.remove('hidden');
    }

    document.getElementById('auth-status').textContent = `Logged in as ${user.email}`;
  } else {
    authControls.classList.remove('hidden');
    logoutButton.classList.add('hidden');
    editButton.classList.add('hidden');
    saveButton.classList.add('hidden');

    document.getElementById('auth-status').textContent = "Not logged in.";
  }
});

// ================= LOAD EVENT =================
async function loadEvent(eventId = EVENT_ID) {
  try {
    const docRef = doc(db, "events", eventId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      document.getElementById('event-name').textContent = "Event Not Found";
      return;
    }

    const event = docSnap.data();
    document.getElementById('loading-spinner').classList.add("hidden");

    // Populate core sections
    document.getElementById('event-name').textContent = event.name;
    document.getElementById('event-date-location').textContent = `${event.date} • ${event.location}`;
    document.getElementById('event-description').textContent = event.description;

    // Populate itinerary
    const itineraryContainer = document.getElementById('itinerary');
    itineraryContainer.innerHTML = event.itinerary.map(item => `
      <div class="flex space-x-4">
        <div class="w-24 text-sm font-medium text-gray-500">${item.time}</div>
        <div>
          <h3 class="font-semibold">${item.title}</h3>
          <p class="text-gray-600 text-sm">${item.details}</p>
        </div>
      </div>
    `).join('');

    // Populate speakers
    const speakersContainer = document.getElementById('speakers');
    speakersContainer.innerHTML = event.speakers.map(speaker => `
      <div class="text-center">
        <img src="${speaker.photo}" class="w-24 h-24 rounded-full mx-auto mb-2" alt="${speaker.name}">
        <h3 class="font-semibold">${speaker.name}</h3>
        <p class="text-gray-500 text-sm">${speaker.role}</p>
      </div>
    `).join('');

    // Populate checklist
    renderChecklist(event.checklist || []);
  } catch (err) {
    console.error("[loadEvent] Error loading event:", err);
  }
}

// ================= CMS MODE =================
function enableCMS() {
  if (auth.currentUser) {
    document.body.classList.add("cms-enabled");
    document.getElementById('edit-button').classList.add('hidden');
    document.getElementById('save-button').classList.remove('hidden');
    document.getElementById('add-checklist-item').classList.remove('hidden');

    activateEditableSections();
    alert("CMS mode enabled! You can now edit.");
  } else {
    alert("You must be logged in to enable CMS mode.");
  }
}

function activateEditableSections() {
  document.getElementById('event-name').contentEditable = true;
  document.getElementById('event-description').contentEditable = true;

  const itineraryControls = document.createElement('button');
  itineraryControls.textContent = "Add Itinerary Item";
  itineraryControls.className = "px-3 py-1 bg-blue-500 text-white rounded mt-2";
  itineraryControls.onclick = addItineraryItem;
  document.querySelector('#itinerary').after(itineraryControls);

  const speakerControls = document.createElement('button');
  speakerControls.textContent = "Add Speaker";
  speakerControls.className = "px-3 py-1 bg-blue-500 text-white rounded mt-2";
  speakerControls.onclick = addSpeaker;
  document.querySelector('#speakers').after(speakerControls);

  document.querySelectorAll('#itinerary .flex').forEach(el => el.classList.add('editable-item'));
  document.querySelectorAll('#speakers .text-center').forEach(el => el.classList.add('editable-item'));
}

// ================= ADD ITINERARY / SPEAKER =================
function addItineraryItem() {
  const time = prompt("Time (e.g., 10:00 AM):");
  const title = prompt("Title:");
  const details = prompt("Details:");
  const container = document.getElementById('itinerary');

  const div = document.createElement('div');
  div.className = "flex space-x-4 editable-item";
  div.innerHTML = `
    <div class="w-24 text-sm font-medium text-gray-500" contenteditable="true">${time}</div>
    <div>
      <h3 class="font-semibold" contenteditable="true">${title}</h3>
      <p class="text-gray-600 text-sm" contenteditable="true">${details}</p>
      <button onclick="this.parentElement.parentElement.remove()" class="text-red-500 text-xs mt-1">Remove</button>
    </div>
  `;
  container.appendChild(div);
}

function addSpeaker() {
  const name = prompt("Speaker name:");
  const role = prompt("Role:");
  const photo = prompt("Photo URL (optional):") || "https://via.placeholder.com/100";
  const container = document.getElementById('speakers');

  const div = document.createElement('div');
  div.className = "text-center editable-item";
  div.innerHTML = `
    <img src="${photo}" class="w-24 h-24 rounded-full mx-auto mb-2" alt="${name}">
    <h3 class="font-semibold" contenteditable="true">${name}</h3>
    <p class="text-gray-500 text-sm" contenteditable="true">${role}</p>
    <button onclick="this.parentElement.remove()" class="text-red-500 text-xs mt-1">Remove</button>
  `;
  container.appendChild(div);
}

// ================= CHECKLIST HANDLING =================
function renderChecklist(checklist) {
  const checklistContainer = document.getElementById('checklist');
  checklistContainer.innerHTML = checklist.map((item, index) => `
    <div class="flex items-center space-x-2">
      <input type="checkbox" data-index="${index}" ${item.checked ? 'checked' : ''} class="checklist-item">
      <label>${item.label}</label>
    </div>
  `).join('');

  document.querySelectorAll('.checklist-item').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = e.target.dataset.index;
      checklist[idx].checked = e.target.checked;
      await saveChecklist(checklist);
    });
  });
}

async function saveChecklist(checklist, eventId = EVENT_ID) {
  try {
    const eventRef = doc(db, "events", eventId);
    await setDoc(eventRef, { checklist }, { merge: true });
  } catch (err) {
    console.error("[Checklist] Error saving checklist:", err);
  }
}

function addChecklistItem() {
  const label = prompt("Enter checklist item:");
  if (!label) return;

  const checklistContainer = document.getElementById('checklist');
  const currentItems = Array.from(checklistContainer.querySelectorAll('input')).map(input => ({
    label: input.nextElementSibling.textContent,
    checked: input.checked
  }));

  currentItems.push({ label, checked: false });
  renderChecklist(currentItems);
  saveChecklist(currentItems);
}

// ================= SAVE CHANGES =================
async function saveChanges(eventId = EVENT_ID) {
  if (!auth.currentUser) {
    alert("You must be logged in to save changes.");
    return;
  }

  const updatedEvent = {
    name: document.getElementById('event-name').textContent,
    description: document.getElementById('event-description').textContent,
    date: document.getElementById('event-date-location').textContent.split(" • ")[0],
    location: document.getElementById('event-date-location').textContent.split(" • ")[1],
    itinerary: [...document.querySelectorAll('#itinerary .editable-item')].map(el => ({
      time: el.children[0].textContent,
      title: el.children[1].querySelector('h3').textContent,
      details: el.children[1].querySelector('p').textContent
    })),
    speakers: [...document.querySelectorAll('#speakers .editable-item')].map(el => ({
      name: el.querySelector('h3').textContent,
      role: el.querySelector('p').textContent,
      photo: el.querySelector('img').src
    })),
    checklist: Array.from(document.querySelectorAll('#checklist input')).map(input => ({
      label: input.nextElementSibling.textContent,
      checked: input.checked
    }))
  };

  try {
    await setDoc(doc(db, "events", eventId), updatedEvent);
    alert("Event updated successfully!");
    disableCMS();
  } catch (err) {
    console.error("[saveChanges] Error saving event:", err);
    alert("Failed to save event.");
  }
}

// ================= EXIT CMS =================
function disableCMS() {
  document.body.classList.remove("cms-enabled");

  document.getElementById('event-name').contentEditable = false;
  document.getElementById('event-description').contentEditable = false;

  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes("Add Itinerary Item") || btn.textContent.includes("Add Speaker")) {
      btn.remove();
    }
  });

  document.getElementById("save-button").classList.add("hidden");
  document.getElementById("edit-button").classList.remove("hidden");
  document.getElementById('add-checklist-item').classList.add('hidden');

  alert("CMS mode exited.");
}

// ================= EXPORT FUNCTIONS TO WINDOW =================
window.login = login;
window.logout = logout;
window.enableCMS = enableCMS;
window.saveChanges = saveChanges;
window.downloadPDF = downloadPDF;
window.addChecklistItem = addChecklistItem;

// ================= PDF DOWNLOAD =================
async function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 40;

  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text(document.getElementById('event-name').textContent, pageWidth / 2, y, { align: "center" });
  y += 30;

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.text(document.getElementById('event-date-location').textContent, pageWidth / 2, y, { align: "center" });
  y += 30;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Overview", 40, y);
  y += 20;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  const desc = document.getElementById('event-description').textContent;
  const wrappedDesc = pdf.splitTextToSize(desc, pageWidth - 80);
  pdf.text(wrappedDesc, 40, y);
  y += wrappedDesc.length * 14 + 20;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Itinerary", 40, y);
  y += 20;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  document.querySelectorAll('#itinerary .flex').forEach(item => {
    const time = item.querySelector('.w-24').textContent;
    const title = item.querySelector('h3').textContent;
    const details = item.querySelector('p').textContent;

    const line = `${time} — ${title}: ${details}`;
    const wrappedLine = pdf.splitTextToSize(line, pageWidth - 80);

    pdf.text(wrappedLine, 40, y);
    y += wrappedLine.length * 14 + 6;

    if (y > 780) {
      pdf.addPage();
      y = 40;
    }
  });

  y += 20;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Speakers", 40, y);
  y += 20;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  document.querySelectorAll('#speakers .text-center').forEach(sp => {
    const name = sp.querySelector('h3').textContent;
    const role = sp.querySelector('p').textContent;

    pdf.text(`${name} — ${role}`, 40, y);
    y += 20;

    if (y > 780) {
      pdf.addPage();
      y = 40;
    }
  });

  const fileName = document.getElementById('event-name').textContent.replace(/\s+/g, "_");
  pdf.save(`${fileName}.pdf`);
}
