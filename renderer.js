let videoList = [];
const videoEl = document.getElementById('bgVideo');
let imageSchedule = [];
let messageSchedule = [];
let currentMessage = null;
let lastMessageTime = null;
let tickerData = [];
let activeTickerItems = [];
const cog = document.getElementById('settingsCog');
const drawer = document.getElementById('settingsDrawer');
let episodeSchedule = [];

let simulatedYear = window.electron.simulatedYear;
let bgPref = "auto";
let bgApp = "dark";
let archiveModeMode = false;
let speedGuy = 1;

async function initBgPref() {
  bgPref = await window.electron.getBgPreference();

  console.log(`Background Preference Loaded: ${bgPref}`);
}

initBgPref();

function isDaytime(secondsSinceStart) {
  const baseDateGuy = new Date('October 1, 2009 00:00:00');
  const simDateGuy = new Date(baseDateGuy.getTime() + secondsSinceStart * 1000);

  const hour = simDateGuy.getHours();
  return hour >= 6 && hour < 19; // 6:00 AM to 6:59 PM
}


async function initSimulatedYear() {
  simulatedYear = await window.electron.getSimulatedYear();

  console.log(`Simulated Year Loaded: ${simulatedYear}`);
}

async function initArchiveMode() {
  archiveModeMode = await window.electron.getArchiveMode();

  console.log(`Archive Mode Loaded: ${archiveModeMode}`);
}

async function initGetSpeed() {
  speedGuy = await window.electron.getSpeed();

  console.log(`Speed Loaded: ${speedGuy}`);
}

initSimulatedYear();
initArchiveMode();
initGetSpeed();



let shiftFromEST = 0; // Default to no shift, will be set later

window.getOffsetFromEST = getOffsetFromEST;

async function loadEpisodeSchedule() {
  const raw = await window.electron.readFile(`${simulatedYear}episodes.json`);
  try {
    episodeSchedule = JSON.parse(raw);
  } catch {
    episodeSchedule = [];
  }
}

window.electron.onSkipStartup((time) => {
  if (typeof time === 'number' && !isNaN(time)) {

    const tz = document.getElementById('timezoneSelect').value;
    shiftFromEST = getOffsetFromEST(tz);
    document.getElementById('timezoneSelect').value = tz;

    document.getElementById('startup').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    loadImageSchedule();
    loadMessageSchedule();
    loadTickerData();
    loadCachedMap();
    loadEpisodeSchedule();
    watchForUpcomingVideos();
    loadVideoList();
    initBgPref();
    initSimulatedYear();
  }
});

let drawerOpen = false;
// Make sure drawer is hidden off-screen by its real width when app starts
window.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('settingsDrawer');
  drawer.style.right = '-80vw';      // Force hide
  drawerOpen = false;                // Ensure toggle state is synced
  populateTimezones();

  
});

window.applySettings = function() {
  const settings = {
    archiveMode: document.getElementById('archiveMode').checked,
    year: parseInt(document.getElementById('settingYear').value, 10),
    speed: parseFloat(document.getElementById('settingSpeed').value),
    bg: document.getElementById('settingBg').value,
    baseball: document.getElementById('settingBaseball').checked,
    football: document.getElementById('settingFootball').checked,
    basketball: document.getElementById('settingBasketball').checked,
    hockey: document.getElementById('settingHockey').checked,
    news: document.getElementById('settingNews').checked,
    videoGames: document.getElementById('settingVideoGames').checked,
    youtubeVideos: document.getElementById('settingYoutubeVideos').checked,
    music: document.getElementById('settingMusic').checked,
    minecraft: document.getElementById('settingMinecraft').checked
  };

  window.electron.saveSettings(settings);
  window.electron.getSpeed();
}

cog.addEventListener('click', () => {
  drawerOpen = !drawerOpen;

  if (drawerOpen) {
    drawer.style.right = '0';
  } else {
    drawer.style.right = '-80vw';
  }
});



async function loadTickerData() {
  tickerData = await window.electron.getTickerData();
}


async function loadMessageSchedule() {
  messageSchedule = await window.electron.getMessageSchedule();
}


async function loadImageSchedule() {
  imageSchedule = await window.electron.getImageSchedule();
}


function formatSimulatedTime(seconds) {
  if (isNaN(seconds)) {
    return "Invalid Time";
  }

  const baseDate = new Date('October 1, 2009 00:00:00');
  const simDate = new Date(baseDate.getTime() + seconds * 1000);

  const day = simDate.getDate();
  const hours = simDate.getHours() % 12 || 12;
  const minutes = String(simDate.getMinutes()).padStart(2, '0');
  const secondsStr = String(simDate.getSeconds()).padStart(2, '0');
  const ampm = simDate.getHours() >= 12 ? 'PM' : 'AM';

  return `October ${day}th. ${hours}:${minutes}:${secondsStr} ${ampm}, ${simulatedYear}.`;
}



async function submitStart() {

  const canvas = document.getElementById('labelCanvas');
  canvas.width = 1920;
  canvas.height = 1080;

  const timezone = document.getElementById('timezoneSelect').value;
  shiftFromEST = getOffsetFromEST(timezone);
  console.log(`Offset from EST: ${shiftFromEST} hours`);
  const day = document.getElementById('dayInput').value;
  const time = document.getElementById('timeInput').value;

  console.log("Timezone selected:", timezone);

  await window.electron.setSimulationTime({ day, time });
  await loadImageSchedule();
  await loadMessageSchedule();
  await loadTickerData();
  await loadCachedMap();
  await loadEpisodeSchedule();
  watchForUpcomingVideos();


  
  document.getElementById('startup').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadVideoList();
}

window.electron.onTick(async (seconds) => {
  const formatted = formatSimulatedTime(seconds);
  document.getElementById('clock').innerText = formatted;

  // ---------------- IMAGE SCHEDULE CHECK ----------------
  activeImages = [];

  // 1. Find all images that should be active now
  for (const img of imageSchedule) {
    const start = img.time + shiftFromEST;
    const end = start + img.duration;
    if (seconds >= start && seconds < end) {
      activeImages.push(img);
    }
  }

  // 2. If no images active, hide
  if (activeImages.length === 0) {
    hideImage(); // Define this to clear image
    return;
  }

  // 3. Choose which image to show: alternate every second
  const switchInterval = 10; // Change to how often (in seconds) you want to switch images
const currentIndex = Math.floor(seconds / switchInterval) % activeImages.length;
  const currentImage = activeImages[currentIndex];
  const pathIMG = await window.electron.getImagePath(currentImage.filename);
  showImage(pathIMG, 1); // Always show for 1s to allow clean switching

  // ---------------- TEXT MESSAGE CHECK ----------------
  for (const msg of messageSchedule) {
    if (msg.time + shiftFromEST === seconds) {
      currentMessage = msg.message;
      lastMessageTime = seconds;
      document.getElementById('messageText').innerText = currentMessage;
      break;
    }
  }

  // Display "X ago" time since message
  if (lastMessageTime !== null) {
    const elapsed = seconds - lastMessageTime;
    const display =
      elapsed < 60
        ? `${elapsed}s ago`
        : elapsed < 3600
        ? `${Math.floor(elapsed / 60)}m ago`
        : `${Math.floor(elapsed / 3600)}h ago`;

    document.getElementById('messageTimeAgo').innerText = display;
  }

  // ---------------- TICKER CHECK ----------------
  const baseDate = new Date('October 1, 2009 00:00:00');
  const currentSimTime = seconds;
  const currentSimDate = new Date(baseDate.getTime() + currentSimTime * 1000);
  const currentDay = currentSimDate.getDate();

  tickerData.forEach(item => {
    const itemDate = new Date(baseDate.getTime() + item.time * 1000);
    const itemDay = itemDate.getDate();

    const alreadyActive = activeTickerItems.some(t =>
      t.genre === item.genre && t.message === item.message
    );

    if (
      !alreadyActive &&
      currentSimTime >= item.time + shiftFromEST &&
      currentSimTime < item.time + shiftFromEST + 86400
    ) {
      activeTickerItems.push(item);
      updateTickerDisplay();
    }
  });

  const networkWindow = document.getElementById('networkWindow');
const networkContent = document.getElementById('networkContent');

const currentEpisodes = episodeSchedule.filter(ep => seconds >= ep.start && seconds < ep.end);

if (currentEpisodes.length > 0) {
  networkWindow.style.display = 'block';
  networkContent.innerHTML = currentEpisodes.map(ep => {
    const linksHTML = Object.entries(ep.links).map(([service, url]) =>
      `<img src="icons/${service.toLowerCase()}.png" 
            style="height: 20px; margin-right: 6px; cursor: pointer;" 
            title="${service}"
            onclick="openStreamingLink('${url.replace(/'/g, "\\'")}')" />`
    ).join('');

    return `
    <div style="margin-bottom: 12px;">
    <img src="icons/${ep.network.toLowerCase()}.png" style="height: 30px;" title="${ep.network}"><br>
    ${ep.show}: <i>${ep.episode}</i><br>
    ${linksHTML}
    </div>
    `;
  }).join('');
} else {
  networkWindow.style.display = 'none';
}

function updateBgLight() {
if (isDaytime(seconds)) {
    if (bgPref === "auto") {
        bgApp = "day";
    }

    if (bgPref === "dark") {
        bgApp = "night";
    }

    if (bgPref === "light") {
        bgApp = "day";
    }
}
else {
    if (bgPref === "auto") {
        bgApp = "night";
    }

    if (bgPref === "dark") {
        bgApp = "night";
    }

    if (bgPref === "light") {
        bgApp = "day";
    }

}
window.electron.sendToMain('bg-friend', `${bgApp}`);
}

if (seconds % 20 === 0) {
updateTickerDisplay()
}
updateBgLight()

});

const linkToFile = {};
let cachedLinks = new Set();
let introducedLinks = new Set();

async function loadCachedMap() {
  const mapStr = await window.electron.readFile('cachedLinks.json');
  try {
    const parsed = JSON.parse(mapStr);
    Object.assign(linkToFile, parsed);
    Object.keys(parsed).forEach(link => cachedLinks.add(link));
    console.log("🔁 Cached link mapping loaded.");
  } catch (e) {
    console.warn("⚠️ No cachedLinks.json or invalid format.");
  }
}

async function watchForUpcomingVideos() {
  const response = await window.electron.readFile(`${simulatedYear}ytvideos.json`);
  let schedule;
  try {
    schedule = JSON.parse(response);
  } catch (e) {
    console.error("❌ Failed to parse ytvideos.json:", e);
    return;
  }

  setInterval(async () => {
    const currentTime = await window.electron.getSimTime();

    for (const item of schedule) {
      const { link, start } = item;

      //print (start + shiftFromEST) - currentTime
      console.log(`Time until ${link}: ${(start + shiftFromEST) - currentTime} seconds`);

      let dlDelay = 200 * speedGuy; // 200 seconds per speed unit

      // Trigger pre-cache
      if ((start + shiftFromEST) - currentTime === dlDelay && !cachedLinks.has(link)) {
        console.log(`⏳ Pre-caching ${link} for upcoming playback...`);
        const result = await cache(link);
        if (result?.filename) {
          linkToFile[link] = result.filename;
          cachedLinks.add(link);
        }
      }

      // Trigger actual introduction
      if ((start + shiftFromEST) === currentTime && !introducedLinks.has(link)) {
        const filename = linkToFile[link];
        if (filename) {
          console.log(`🎬 Introducing video ${filename}`);
          introduce(filename);
          introducedLinks.add(link);
        } else {
          console.warn(`⚠️ No cached filename found for ${link}`);
        }
      }
    }
  }, 1000); // Check every second
}



function showImage(src, duration) {
  const container = document.getElementById('imageContainer');
  const imgEl = document.getElementById('scheduledImage');

  // Add black background while showing image
  container.style.backgroundColor = 'black';
  imgEl.src = `file://${src}`;
  imgEl.style.display = 'block';

  setTimeout(() => {
    // Hide image and remove black background
    imgEl.style.display = 'none';
    imgEl.src = '';
    container.style.backgroundColor = 'transparent';
  }, duration * 1000);
}

async function updateTickerDisplay() {
  const tickerTrack = document.getElementById('tickerTrack');

  // Clean out expired items (older than 24 hours from their adjusted time)
  const now = await window.electron.getSimTime();
  activeTickerItems = activeTickerItems.filter(item =>
    now < item.time + shiftFromEST + 86400
  );

  if (activeTickerItems.length === 0) {
    tickerTrack.innerText = "";
    tickerTrack.style.animation = "none";
    return;
  }

  const singleLine = activeTickerItems.map(item =>
    `[${item.genre}] ${item.message}`
  ).join(' • ');

  const repeated = Array(500).fill(singleLine).join(' • ');

  tickerTrack.innerText = repeated;

  // Wait for DOM update to measure width
  requestAnimationFrame(() => {
    const width = tickerTrack.scrollWidth;
    document.documentElement.style.setProperty('--ticker-width', `${width}px`);

    tickerTrack.style.animation = "none"; // Reset
    // Duration based on pixels: adjust speed here (e.g., 50px/sec)
    const speedPxPerSec = 50;
    const durationSec = width / speedPxPerSec;
    tickerTrack.style.animation = `scrollTickerPixels ${durationSec}s linear infinite`;
  });
}

function openChangeTime() {
  document.getElementById('changeTimeModal').style.display = 'flex';
}

function closeChangeTime() {
  document.getElementById('changeTimeModal').style.display = 'none';
}

function applyNewTime() {
  const day = parseInt(document.getElementById('newDay').value, 10);
  const time = document.getElementById('newTime').value;
  const tz = document.getElementById('timezoneSelect').value;

  if (isNaN(day) || day < 1 || day > 31 || !time) {
    alert("Please enter a valid day and time.");
    return;
  }

  window.electron.relaunchApp({ day, time, tz });
}



let services = [
  "Archive.org", "Paramount", "Amazon", "Disney", "Hulu", "Apple", "Netflix", "Peacock"
];

function renderServicePriorityList() {
  const container = document.getElementById('priorityList');
  container.innerHTML = '';

  services.forEach((service, index) => {
    const div = document.createElement('div');
    div.style.margin = '6px 0';
    div.innerHTML = `
      ${service}
      <button onclick="moveService(${index}, -1)">▲</button>
      <button onclick="moveService(${index}, 1)">▼</button>
    `;
    container.appendChild(div);
  });
}

function moveService(index, direction) {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < services.length) {
    [services[index], services[newIndex]] = [services[newIndex], services[index]];
    renderServicePriorityList();
  }
}



async function loadVideoList() {
  videoList = await window.electron.loadVideoList();
  if (videoList.length > 0) {
    playNextVideo();
  }
}

async function playNextVideo() {
  if (videoList.length === 0) {
    console.log("🔁 All videos played. Reloading...");
    videoList = await window.electron.loadVideoList();
    if (videoList.length === 0) {
      console.warn("⚠️ Still no videos to play.");
      return;
    }
  }

  const filename = videoList[0];
  const fullPath = await window.electron.getVideoPath(filename);
  console.log("▶️ Playing:", fullPath);

  const videoEl = document.getElementById('bgVideo');
  videoEl.src = `file://${fullPath}`;
  videoEl.play().catch(e => console.error("⚠️ Video play error:", e));

  await window.electron.removeFirstVideoAndUpdate();
  videoList.shift();
}

const cachedDir = window.electron.getCachedDir();

const formations = {
  0: [],
  1: [
    { width: 66, height: 57, left: 2, top: 37 }
  ],
  2: [
    { width: 56, height: 57, left: 2, top: 37 },
    { width: 26, height: 29, left: 20, top: 8 }
  ],
  3: [
    { width: 50, height: 44, left: 20, top: 44 },
    { width: 16, height: 20, left: 2, top: 37 },
    { width: 16, height: 20, left: 2, top: 61 }
  ],
  4: [
    { width: 38, height: 38, left: 4, top: 49 },
    { width: 20, height: 24, left: 52, top: 8 },
    { width: 20, height: 24, left: 52, top: 34 },
    { width: 20, height: 24, left: 26, top: 8 }
  ],
  5: [
    { width: 38, height: 38, left: 4, top: 49 },
    { width: 18, height: 22, left: 44, top: 37 },
    { width: 18, height: 22, left: 64, top: 37 },
    { width: 18, height: 22, left: 44, top: 63 },
    { width: 18, height: 22, left: 64, top: 63 }
  ],
  6: [
    { width: 38, height: 38, left: 2, top: 49 },
    { width: 16, height: 20, left: 42, top: 37 },
    { width: 16, height: 20, left: 60, top: 37 },
    { width: 16, height: 20, left: 42, top: 61 },
    { width: 16, height: 20, left: 60, top: 61 },
    { width: 16, height: 20, left: 24, top: 24 }
  ],
  7: [
    { width: 38, height: 38, left: 4, top: 49 },
    { width: 14, height: 18, left: 44, top: 37 },
    { width: 14, height: 18, left: 60, top: 37 },
    { width: 14, height: 18, left: 44, top: 59 },
    { width: 14, height: 18, left: 60, top: 59 },
    { width: 14, height: 18, left: 27, top: 37 },
    { width: 14, height: 18, left: 27, top: 59 }
  ],
  8: [
    { width: 38, height: 38, left: 4, top: 49 },
    { width: 12, height: 16, left: 44, top: 37 },
    { width: 12, height: 16, left: 58, top: 37 },
    { width: 12, height: 16, left: 44, top: 55 },
    { width: 12, height: 16, left: 58, top: 55 },
    { width: 12, height: 16, left: 44, top: 73 },
    { width: 12, height: 16, left: 58, top: 73 },
    { width: 12, height: 16, left: 30, top: 73 }
  ],
  9: [
    { width: 38, height: 38, left: 4, top: 49 },
    { width: 11, height: 14, left: 44, top: 37 },
    { width: 11, height: 14, left: 57, top: 37 },
    { width: 11, height: 14, left: 44, top: 52 },
    { width: 11, height: 14, left: 57, top: 52 },
    { width: 11, height: 14, left: 44, top: 67 },
    { width: 11, height: 14, left: 57, top: 67 },
    { width: 11, height: 14, left: 30, top: 37 },
    { width: 11, height: 14, left: 30, top: 52 }
  ]
};

const state = [];



async function cache(youtubeLink) {
  const result = await window.electron.cache(youtubeLink);
  if (result.success && result.filename) {
    console.log("✅ Cached:", result.filename);
    linkToFile[youtubeLink] = result.filename;
    cachedLinks.add(youtubeLink);

    // Save map to disk
    await window.electron.saveCachedMap(linkToFile);
  } else {
    console.error("❌ Failed to cache video:", result.error);
  }
  return result;
}


  
  function renderFrames() {
    const count = parseInt(document.getElementById('frameCountInput').value);
    renderFormation(count);
  }
  
  function renderFormation(count) {
    const formation = formations[count];
    const container = document.getElementById('videoContainer');
    container.innerHTML = '';
    state.length = 0;
  
    if (!formation) return;
  
    formation.forEach((layout, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'video-frame';
      wrapper.style.width = layout.width + '%';
      wrapper.style.height = layout.height + '%';
      wrapper.style.left = layout.left + '%';
      wrapper.style.top = layout.top + '%';
      wrapper.style.position = 'absolute';
  
      const video = document.createElement('video');
      video.controls = true;
      video.muted = true;
      wrapper.appendChild(video);
  
      const btn = document.createElement('button');
      btn.innerText = 'Make Main';
      btn.style.position = 'absolute';
      btn.style.top = '5px';
      btn.style.left = '5px';
      btn.style.zIndex = 10;
      btn.onclick = () => swapFrames(idx, 0);
      wrapper.appendChild(btn);
  
      container.appendChild(wrapper);
  
      state.push({
        videoEl: video,
        file: null,
        muted: true,
        get currentTime() {
          return video.currentTime;
        },
        set currentTime(t) {
          video.currentTime = t;
        }
      });
    });
  }
  



function swapFrames(a, b) {
  if (a === b || !state[a] || !state[b]) return;

  const frameA = state[a];
  const frameB = state[b];

  const fileA = frameA.file;
  const fileB = frameB.file;

  const timeA = frameA.videoEl.currentTime;
  const timeB = frameB.videoEl.currentTime;

  const mutedA = frameA.muted;
  const mutedB = frameB.muted;

  // Swap video sources
  frameA.videoEl.src = fileB ? `cached/${fileB}` : '';
  frameB.videoEl.src = fileA ? `cached/${fileA}` : '';

  frameA.file = fileB;
  frameB.file = fileA;

  frameA.muted = mutedB;
  frameB.muted = mutedA;

  frameA.videoEl.muted = mutedB;
  frameB.videoEl.muted = mutedA;

  if (fileB) frameA.videoEl.currentTime = timeB;
  if (fileA) frameB.videoEl.currentTime = timeA;

  frameA.videoEl.play();
  frameB.videoEl.play();
}

window.introduce = function(filename) {
  const currentCount = state.length;
  const nextCount = currentCount + 1;

  if (!formations[nextCount]) {
    alert(`Formation for ${nextCount} frames not defined.`);
    return;
  }

  const oldState = [...state];
  const container = document.getElementById('videoContainer');
  const newFormation = formations[nextCount];

  container.innerHTML = '';
  state.length = 0;

  newFormation.forEach((layout, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'video-frame';
    wrapper.style.width = layout.width + '%';
    wrapper.style.height = layout.height + '%';
    wrapper.style.left = layout.left + '%';
    wrapper.style.top = layout.top + '%';
    wrapper.style.position = 'absolute';

    const video = document.createElement('video');
    video.controls = true;
    wrapper.appendChild(video);

    const btn = document.createElement('button');
    btn.innerText = 'Make Main';
    btn.style.position = 'absolute';
    btn.style.top = '5px';
    btn.style.left = '5px';
    btn.style.zIndex = 10;
    btn.onclick = () => swapFrames(idx, 0);
    wrapper.appendChild(btn);

    container.appendChild(wrapper);

    if (idx < oldState.length) {
      const old = oldState[idx];
      video.src = old.file ? `cached/${old.file}` : '';
      video.muted = old.muted;
      video.currentTime = old.videoEl.currentTime;
      if (old.file) video.play();

      attachOnEnded(video, old.file);
      state.push({
        videoEl: video,
        file: old.file,
        muted: old.muted,
        get currentTime() { return video.currentTime; },
        set currentTime(t) { video.currentTime = t; }
      });
    } else {
      video.src = `cached/${filename}`;
      video.muted = true;
      video.play();

      attachOnEnded(video, filename);
      state.push({
        videoEl: video,
        file: filename,
        muted: true,
        get currentTime() { return video.currentTime; },
        set currentTime(t) { video.currentTime = t; }
      });
    }
  });

  // Shared function to ensure correct video ends cleanly
  function attachOnEnded(videoEl, file) {
    videoEl.onended = () => {
      const index = state.findIndex(s => s.videoEl === videoEl);
      if (index === -1) return;

      state.splice(index, 1);

      if (file) {
        if (!archiveModeMode) {
      // 🔁 Find the link that mapped to this file
      const linkToDelete = Object.keys(linkToFile).find(link => linkToFile[link] === file);
      
      if (linkToDelete) {
        delete linkToFile[linkToDelete];         // Remove from in-memory map
        cachedLinks.delete(linkToDelete);        // Remove from cachedLinks set

        window.electron.saveCachedMap(linkToFile); // Persist updated map to disk
      }

      // 🗑 Delete file from disk
      window.electron.deleteCachedFile(file);
    }
    }


      const container = document.getElementById('videoContainer');
      const reducedCount = state.length;
      const newLayout = formations[reducedCount];

      container.innerHTML = '';

      state.forEach((old, i) => {
        const layout = newLayout[i];
        const wrapper = document.createElement('div');
        wrapper.className = 'video-frame';
        wrapper.style.width = layout.width + '%';
        wrapper.style.height = layout.height + '%';
        wrapper.style.left = layout.left + '%';
        wrapper.style.top = layout.top + '%';
        wrapper.style.position = 'absolute';

        const newVid = document.createElement('video');
        newVid.controls = true;
        newVid.muted = old.muted;
        newVid.src = old.file ? `cached/${old.file}` : '';
        newVid.currentTime = old.currentTime;
        newVid.play();

        const btn = document.createElement('button');
        btn.innerText = 'Make Main';
        btn.style.position = 'absolute';
        btn.style.top = '5px';
        btn.style.left = '5px';
        btn.style.zIndex = 10;
        btn.onclick = () => swapFrames(i, 0);
        wrapper.appendChild(btn);
        wrapper.appendChild(newVid);
        container.appendChild(wrapper);

        attachOnEnded(newVid, old.file); // reattach cleanly to new reference

        state[i] = {
          videoEl: newVid,
          file: old.file,
          muted: old.muted,
          get currentTime() { return newVid.currentTime; },
          set currentTime(t) { newVid.currentTime = t; }
        };
      });
    };
  }
};



function drawTextLine(x1, y1, x2, y2, text, spacing = 100) {
  const canvas = document.getElementById('labelCanvas');
  const ctx = canvas.getContext('2d');

  // Clear previous lines if needed
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw base line
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Get vector and length
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const count = Math.floor(distance / spacing);

  // Normalize direction
  const unitX = dx / distance;
  const unitY = dy / distance;

  // Angle for text rotation
  const angle = Math.atan2(dy, dx);

  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 1; i < count; i += 2) {
    const tx = x1 + unitX * spacing * i;
    const ty = y1 + unitY * spacing * i;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}


  function introduceSelected() {
    const file = document.getElementById('introduceSelect').value;
    introduce(file);
  }


videoEl.onended = () => {
  playNextVideo();
};

function drawTextLine(x1, y1, x2, y2, text, spacing = 100) {
  const canvas = document.getElementById('labelCanvas');
  const ctx = canvas.getContext('2d');

  // Auto-resize canvas to match window
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Draw the line
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Vector math
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const count = Math.floor(length / spacing);

  const ux = dx / length;
  const uy = dy / length;
  const angle = Math.atan2(dy, dx);

  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 1; i < count; i += 2) {
    const px = x1 + i * spacing * ux;
    const py = y1 + i * spacing * uy;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function populateTimezones() {
  const select = document.getElementById('timezoneSelect');

  const timezones = Intl.supportedValuesOf('timeZone');  // Modern way
  // Fallback for older Electron: use a hardcoded list if needed

  for (const zone of timezones) {
    const option = document.createElement('option');
    option.value = zone;
    option.textContent = zone;
    select.appendChild(option);
  }

  // Set default to system timezone
  select.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
}


function getOffsetFromEST(selectedTimezone) {
  const now = new Date();

  const estOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset'
  }).formatToParts(now).find(part => part.type === 'timeZoneName').value;

  const selectedOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: selectedTimezone,
    timeZoneName: 'shortOffset'
  }).formatToParts(now).find(part => part.type === 'timeZoneName').value;

  const parseOffset = offsetStr => {
    const match = offsetStr.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!match) return 0;
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return hours + (hours >= 0 ? minutes / 60 : -minutes / 60);
  };

  const estHours = parseOffset(estOffset);
  const selectedHours = parseOffset(selectedOffset);

  const futty = selectedHours - estHours;
  return futty * 3600;
}

window.electron.getTimezoneArg?.()?.then(tz => {
  if (tz) {
    selectedTimeZone = tz;
    shiftFromEST = getOffsetFromEST(tz);
    document.getElementById('timezoneSelect').value = tz;
  }
});

window.electron.onSetTimezone((tz) => {
  selectedTimeZone = tz;
  shiftFromEST = getOffsetFromEST(tz);
  document.getElementById('timezoneSelect').value = tz;
});

function openStreamingLink(url) {
  window.electron.openExternalLink(url);
}

window.onload = () => {
  renderFormation(0); // Start with 0 frames    // Still load dropdown options
  const canvas = document.getElementById('labelCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

};
