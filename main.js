const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { URL } = require('url');
const fs = require('fs');
const os = require('os');
const https = require('https');
const settingsPath = path.join(__dirname, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const simulatedYear = settings[0].year;
const archiveMode = settings[0].archiveMode;
const speed = settings[0].speed;
let tickSpeed = 1000 / speed;
const bgPref = settings[0].bg;
let bgApp2 = "night";

ipcMain.handle('save-settings', async (event, newSettings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify([newSettings], null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('⚠️ Failed to save settings:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-simulated-year', () => {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  return settings[0].year;
});

ipcMain.handle('get-speed', () => {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  if (Number.isInteger(1000 / settings[0].speed) && settings[0].speed < 1000) {
  tickSpeed = 1000 / settings[0].speed;
} else {
  tickSpeed = 10;
}
  return settings[0].speed;
});

ipcMain.handle('get-bg-preference', () => {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  return settings[0].bg;
});

ipcMain.handle('get-archive-mode', () => {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  return settings[0].archiveMode;
});

ipcMain.on('bg-friend', (event, bgPoop) => {
  bgApp2 = bgPoop;
});

const imageSchedulePath = path.join(__dirname, `${simulatedYear}images.json`);
const imageDir = path.join(__dirname, 'images');
const messagePath = path.join(__dirname, `${simulatedYear}messages.json`);
const tickerPath = path.join(__dirname, `${simulatedYear}ticker.json`);
const { spawn } = require('child_process');
const ytdlpExe = path.join(__dirname, 'yt-dlp.exe');
const { Builder, By } = require('selenium-webdriver');
require('chromedriver');


const { execFile } = require('child_process');

const launchArgs = process.argv.slice(1);
let overrideTimeArg = null;
let timezoneArg = null;

for (const arg of launchArgs) {
  if (arg.startsWith('--simtime=')) {
    overrideTimeArg = arg.replace('--simtime=', '');
  } else if (arg.startsWith('--timezone=')) {
    timezoneArg = arg.replace('--timezone=', '');
  }
}

function findChromePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null; 
}

function launchInNewBrowserWindow(url) {
  const chromePath = findChromePath();

  const x = 400;
  const y = 400;
  const width = 1280;
  const height = 720;

  if (chromePath) {
    try {
      const chromeArgs = [
        `--app=${url}`,
        `--window-position=${x},${y}`,
        `--window-size=${width},${height}`
      ];

      spawn(chromePath, chromeArgs, {
        detached: true,
        stdio: 'ignore'
      }).unref();
    } catch (err) {
      console.error("⚠️ Failed to launch Chrome:", err.message);
      shell.openExternal(url);
    }
  } else {
    console.warn("⚠️ Chrome not found. Falling back to default browser.");
    shell.openExternal(url);
  }
}

ipcMain.on('open-external', (event, url) => {
  launchInNewBrowserWindow(url);
});


let simulationTime = overrideTimeArg ? parseInt(overrideTimeArg, 10) : 0;
let simInterval = null;
const cachedDir = path.join(__dirname, 'cached');

let videoDir = path.join(__dirname, `${bgApp2}videos`);
let playlistPath = path.join(__dirname, `${bgApp2}bgvideo.txt`);

console.log("Playlist path is now: " + playlistPath);

ipcMain.handle('read-file', (event, relativePath) => {
  const fullPath = path.join(__dirname, relativePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (err) {
    console.error("⚠️ Failed to read file:", fullPath, err);
    return '';
  }
});

ipcMain.handle('delete-cached-file', async (event, filename) => {
  const fullPath = path.join(__dirname, 'cached', filename);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Deleted cached file: ${filename}`);
      return { success: true };
    } else {
      console.warn(`⚠️ File not found for deletion: ${filename}`);
      return { success: false, error: 'File not found' };
    }
  } catch (err) {
    console.error(`❌ Failed to delete ${filename}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-cached-map', (event, mapObj) => {
  const fullPath = path.join(__dirname, 'cachedLinks.json');
  try {
    const json = JSON.stringify(mapObj, null, 2);
    fs.writeFileSync(fullPath, json, 'utf-8');
    return true;
  } catch (err) {
    console.error("⚠️ Failed to save cached map:", err);
    return false;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 2560,
    height: 74520,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
       additionalArguments: [`--simulatedYear=${simulatedYear}`],
    }
  });

  win.loadFile('index.html');

  const simArg = process.argv.find(arg => arg.startsWith('--simtime='));
  const overrideTimeArg = simArg ? parseInt(simArg.split('=')[1], 10) : null;

  if (!isNaN(overrideTimeArg)) {
    simulationTime = overrideTimeArg;


    simInterval = setInterval(() => {
      simulationTime += 1;
      win.webContents.send('tick', simulationTime);
    }, tickSpeed);


    win.webContents.once('did-finish-load', () => {
      if (overrideTimeArg !== null) {
        win.webContents.send('skip-startup', parseInt(overrideTimeArg, 10));
      }
      if (timezoneArg) { 
        win.webContents.send('set-timezone', timezoneArg);
      }
    });

  }
}

// ---------------- Time Simulation ----------------

function getSecondsSinceStartOfOctober2009(dateStr, timeStr) {
  const inputDate = new Date(`October ${dateStr}, 2009 ${timeStr}`);
  const baseDate = new Date('October 1, 2009 00:00:00');
  const diff = Math.floor((inputDate - baseDate) / 1000);
  return diff;
}

ipcMain.handle('set-simulation-time', (event, { day, time }) => {
  simulationTime = getSecondsSinceStartOfOctober2009(day, time);
  if (simInterval) clearInterval(simInterval);
  simInterval = setInterval(() => {
    simulationTime += 1;
    event.sender.send('tick', simulationTime);
  }, tickSpeed);
});

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function downloadArchiveMp4(url) {
  return new Promise((resolve) => {
    const filename = sanitizeFilename(url.split('/').pop());
    const outputPath = path.join(__dirname, 'cached', filename);

    if (fs.existsSync(outputPath)) {
      console.log(`✅ Archive file already cached: ${filename}`);
      return resolve({ success: true, filename });
    }

    function download(currentUrl, attempt = 0) {
      if (attempt > 5) {
        return resolve({ success: false, error: 'Too many redirects' });
      }

      let options;
        try {
          options = new URL(currentUrl);
        } catch (err) {
          console.error("❌ Invalid URL passed:", currentUrl);
          return resolve({ success: false, error: 'Invalid URL' });
        }
      const requestOptions = {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      };

      console.log(`📡 Requesting: ${currentUrl}`);

      https.get(requestOptions, (res) => {
        const contentType = res.headers['content-type'] || '';

        // Handle redirect
        if ([301, 302].includes(res.statusCode) && res.headers.location) {
          console.log(`➡️ Redirecting to: ${res.headers.location}`);
          return download(res.headers.location, attempt + 1);
        }

        // Handle failure
        if (res.statusCode !== 200) {
          console.error(`❌ HTTP error ${res.statusCode}`);
          res.resume(); // Consume data to free memory
          return resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }

        // Validate content type
        if (!contentType.includes('video') && !contentType.includes('octet-stream')) {
          console.warn(`⚠️ Unexpected content type: ${contentType}`);
          res.resume();
          return resolve({ success: false, error: `Invalid content-type: ${contentType}` });
        }

        const file = fs.createWriteStream(outputPath);
        res.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log(`✅ Archive download complete: ${filename}`);
          resolve({ success: true, filename });
        });

        res.on('error', (err) => {
          console.error("❌ Stream error:", err);
          fs.unlink(outputPath, () => {}); // Delete partial
          resolve({ success: false, error: err.message });
        });
      }).on('error', (err) => {
        console.error("❌ HTTPS error:", err);
        resolve({ success: false, error: err.message });
      });
    }

    download(url);
  });
}


ipcMain.handle('get-cached-dir', () => {
  return path.join(__dirname, 'cached');
});

ipcMain.handle('cache-video', async (event, youtubeUrl) => {
    if (youtubeUrl.includes('archive.org')) {
    return new Promise((resolve) => {
    const args = [
      youtubeUrl,
      '--ffmpeg-location', path.join(__dirname),  
      '-o', path.join(cachedDir, '%(id)s - %(title).100s.%(ext)s'),
      '-f', 'worst[ext=mp4]/mp4',
      '--merge-output-format', 'mp4'
    ];

    const ytdlp = spawn(ytdlpExe, args);

    ytdlp.stdout.on('data', data => {
      console.log(`[yt-dlp] ${data}`);
    });

    ytdlp.stderr.on('data', data => {
      console.error(`[yt-dlp ERROR] ${data}`);
    });

    ytdlp.on('close', code => {
      if (code === 0) {
        const files = fs.readdirSync(cachedDir)
          .filter(f => f.endsWith('.mp4'))
          .map(f => ({
            name: f,
            time: fs.statSync(path.join(cachedDir, f)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time);  
    
        const latest = files.length > 0 ? files[0].name : null;
    
        resolve({ success: true, filename: latest });
      } else {
        resolve({ success: false, error: `yt-dlp exited with code ${code}` });
      }
   });
  });
  }

      if (!youtubeUrl.includes('archive.org')) {
   return new Promise((resolve) => {
    const args = [
      youtubeUrl,
      '--ffmpeg-location', path.join(__dirname),    
      '-o', path.join(cachedDir, '%(id)s - %(title).100s.%(ext)s'),
      '-f', '18',
      '--user-agent', 'Mozilla/5.0',
      '--no-part',
      '--no-playlist',
      //'--cookies', path.join(__dirname, 'cookies1.txt'),
      '--merge-output-format', 'mp4'
    ];

    const ytdlp = spawn(ytdlpExe, args);

    ytdlp.stdout.on('data', data => {
      console.log(`[yt-dlp] ${data}`);
    });

    ytdlp.stderr.on('data', data => {
      console.error(`[yt-dlp ERROR] ${data}`);
    });

    ytdlp.on('close', code => {
      if (code === 0) {
        const files = fs.readdirSync(cachedDir)
          .filter(f => f.endsWith('.mp4'))
          .map(f => ({
            name: f,
            time: fs.statSync(path.join(cachedDir, f)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time);  
    
        const latest = files.length > 0 ? files[0].name : null;
    
        resolve({ success: true, filename: latest });
      } else {
        resolve({ success: false, error: `yt-dlp exited with code ${code}` });
      }
   });
  });
      }

  


});


ipcMain.handle('get-sim-time', () => simulationTime);

// ---------------- Video Playlist ----------------

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function ensureVideoList() {
  if (!fs.existsSync(videoDir)) {
    console.warn("⚠️ No /videos folder found.");
    return [];
  }

  const allVideos = fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4'));
  if (allVideos.length === 0) {
    console.warn("⚠️ No videos found in /videos.");
    return [];
  }

  if (!fs.existsSync(playlistPath) || fs.readFileSync(playlistPath, 'utf-8').trim() === '') {
    shuffle(allVideos);
    fs.writeFileSync(playlistPath, allVideos.join('\n'), 'utf-8');
  }

  const list = fs.readFileSync(playlistPath, 'utf-8')
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);


  if (list.length === 0) {
    shuffle(allVideos);
    fs.writeFileSync(playlistPath, allVideos.join('\n'), 'utf-8');
    return allVideos;
  }

  return list;
}

ipcMain.handle('get-image-schedule', () => {
  if (!fs.existsSync(imageSchedulePath)) return [];
  const content = fs.readFileSync(imageSchedulePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
});

ipcMain.handle('get-image-path', (event, filename) => {
  return path.join(imageDir, filename);
});

ipcMain.handle('get-message-schedule', () => {
  if (!fs.existsSync(messagePath)) return [];
  const content = fs.readFileSync(messagePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
});


ipcMain.handle('load-video-list', () => ensureVideoList());

ipcMain.handle('get-video-path', (event, filename) => {
  return path.join(videoDir, filename);
});

ipcMain.handle('remove-played-video', () => {
  if (!fs.existsSync(playlistPath)) return;
  const lines = fs.readFileSync(playlistPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  lines.shift(); 
  fs.writeFileSync(playlistPath, lines.join('\n'), 'utf-8');
});

ipcMain.handle('get-ticker-data', () => {
  if (!fs.existsSync(tickerPath)) return [];
  const content = fs.readFileSync(tickerPath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
});

let seleniumWindows = [];

ipcMain.handle('launch-streaming-window', async (event, url, bounds) => {
  const driver = await new Builder().forBrowser('chrome').build();
  seleniumWindows.push(driver);

  await driver.get(url);

 
  const interval = setInterval(async () => {
    try {
      const win = BrowserWindow.getAllWindows()[0];
      const [winX, winY] = win.getPosition();
      const scaleFactor = win.webContents.getZoomFactor();

      await driver.manage().window().setRect({
        width: Math.round(bounds.width * scaleFactor),
        height: Math.round(bounds.height * scaleFactor),
        x: Math.round(winX + bounds.x * scaleFactor),
        y: Math.round(winY + bounds.y * scaleFactor)
      });
    } catch (e) {
      clearInterval(interval);
    }
  }, 1000);
});

ipcMain.on('relaunch-app', (event, { day, time, tz }) => {
  const seconds = getSecondsSinceStartOfOctober2009(day, time);

  app.relaunch({
    args: process.argv
      .slice(1)
      .filter(arg => !arg.startsWith('--simtime=') && !arg.startsWith('--timezone='))
      .concat([
        `--simtime=${seconds}`,
        `--timezone=${tz}`
      ])
  });

  app.exit(0);
});

async function runEverySecond() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    videoDir = path.join(__dirname, `${bgApp2}videos`);
    playlistPath = path.join(__dirname, `${bgApp2}bgvideo.txt`);
  }
}

runEverySecond();

app.whenReady().then(createWindow);
