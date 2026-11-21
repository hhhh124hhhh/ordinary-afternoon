(() => {
  const stops = [
    {
      id: 'read', icon: 'book', title: '读一页', place: '林间书屋',
      text: '翻开《金瓶梅》。以前只记得他做了什么，这次却想知道，身边的人为什么愿意替他说一句话。隔了几年重读，先前略过去的地方，忽然有了分量。',
      quote: '读到同一页时，翻书的人已经变了。',
      action: '再翻一页',
      notes: ['有句话让你停了下来。你先把书摊着，抬头看一会儿树。', '页边夹着一片干叶。你已经想不起它是在哪儿捡的了。'],
      marker: [-3.18,3.18,-1.52], approach: [-2.86,-.81], view: [-2.82,1.32,-.99],
      stage: [-3.08,-.68,-2.96], pet: [-2.45,-.70], angle: .45, zoom: 2.16
    },
    {
      id: 'listen', icon: 'music', title: '听一会儿', place: '留声机旁',
      text: '唱针落下来。头几个音有点生涩，你以为自己会觉得吵，后来才听见两个音之间长长的空隙。远处的鸟叫刚好落在里面。',
      quote: '第一次听见一种声音的下午，也可以单独记一笔。',
      action: '播放一段旋律',
      notes: ['把这一小段听完。余音散了，可以再放一次。'],
      marker: [2.76,2.50,-1.91], approach: [2.67,-1.54], view: [2.38,1.05,-1.42],
      stage: [2.04,-1.42,-2.00], pet: [1.68,-1.02], angle: -.22, zoom: 2.23
    },
    {
      id: 'together', icon: 'people', title: '陪一会儿', place: '两人的长椅',
      text: '和孩子在长椅上分一只橘子。你剥得有点急，孩子却在数一瓣有几粒籽。再往后回想这个下午，你大概会先想起指尖的橘子味。',
      quote: '人生的一部分，就是在自己的生命里遇见其他生命。',
      action: '坐下，分一只橘子',
      notes: ['一人一半。椅子旁还有一点晒得到太阳的地方。'],
      marker: [3.6,1.55,1.73], approach: [3.16,1.67], view: [3.10,.91,1.43],
      stage: [2.87,2.12,0], pet: [3.93,1.94], angle: .21, zoom: 2.28
    },
    {
      id: 'create', icon: 'pencil', title: '做点东西', place: '没做完的工作台',
      text: '桌上摊着做了半年的游戏原型。你记得第一次把角色跑起来时的兴奋，也记得后来连着几个周末都想把电脑合上。今天，你终于愿意把这两件事一起承认。',
      quote: '有些事情，只有亲自走过一段，才知道自己究竟喜不喜欢。',
      action: '试写一笔',
      notes: ['铅笔在纸上绕了几下。接下来想写什么，可以慢慢想。'],
      marker: [-2.73,1.59,2], approach: [-2.72,1.58], view: [-2.58,.88,1.82],
      stage: [-2.48,2.43,-2.94], pet: [-1.90,2.22], angle: .77, zoom: 2.31
    },
    {
      id: 'rest', icon: 'leaf', title: '什么也不做', place: '老树下',
      text: '坐在池塘边的石头上，脚尖轻轻晃出一圈水纹。你想了一会儿那些没有走过的路。等到起身，也没有得出什么结论。只是腿有点麻，天比刚才凉一点。',
      quote: '就算没有变得更好，那段时光也不因此失去价值。',
      action: '再坐一会儿',
      notes: ['树影移了一点。你还可以再待一会儿。'],
      marker: [-.32,1.14,1.18], approach: [-.32,1.02], view: [.03,.80,1.44],
      stage: [-.32,1.0,0], pet: [.24,1.01], angle: .57, zoom: 1.96
    }
  ];
  const times = [
    {name:'深夜', minute:0, theme:'night', color:'#0d141d'},
    {name:'清晨', minute:345, theme:'dawn', color:'#191d23'},
    {name:'白昼', minute:465, theme:'afternoon', color:'#101a18'},
    {name:'午后', minute:780, theme:'afternoon', color:'#101a18'},
    {name:'日落', minute:1065, theme:'sunset', color:'#201b17'},
    {name:'暮色', minute:1140, theme:'dusk', color:'#121b24'},
    {name:'深夜', minute:1260, theme:'night', color:'#0d141d'}
  ];
  const $ = id => document.getElementById(id);
  const icon = name => '<svg aria-hidden="true"><use href="#' + name + '"/></svg>';
  const intro = $('intro');
  const story = $('story');
  const walking = $('walking');
  const canvas = $('world');
  const menu = $('island-menu');
  const journal = $('journal');
  const journalText = $('journal-text');
  const journalStatus = $('journal-status');
  const journalKey = 'ordinary-afternoon-note';
  let island, active = -1, timeIndex = -1, noteIndex = 0;
  let clock = 980, clockAt = performance.now(), clockPaused = false, season = 1;
  let audio, wind, melody = [];
  let walkMode = false, nearby = -1;
  let guideShown = false, menuShortcutPending = false;
  const directions = {
    up:[0,1], left:[-1,0], down:[0,-1], right:[1,0],
    upLeft:[-1,1], upRight:[1,1], downLeft:[-1,-1], downRight:[1,-1]
  };
  const movementKeys = {
    KeyW:'up', ArrowUp:'up', KeyA:'left', ArrowLeft:'left',
    KeyS:'down', ArrowDown:'down', KeyD:'right', ArrowRight:'right'
  };
  const pressed = new Set(), touchMoves = new Map();

  const items = stops.map((stop,index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stop';
    button.setAttribute('aria-pressed','false');
    button.innerHTML = '<span class="stop-icon">' + icon(stop.icon) + '</span><span><strong>' + stop.title + '</strong><small>' + stop.place + '</small></span>';
    button.addEventListener('click',() => openStop(index));
    $('stops').append(button);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'marker';
    marker.setAttribute('aria-label',stop.title + ' · ' + stop.place);
    marker.setAttribute('aria-pressed','false');
    marker.innerHTML = icon(stop.icon) + '<span>' + stop.title + '</span>';
    marker.addEventListener('click',() => openStop(index));
    $('markers').append(marker);
    return {stop,button,marker};
  });
  function updateMarkers(project) {
    for (const [index,{stop,marker}] of items.entries()) {
      marker.hidden = document.body.dataset.view !== 'walk' || index !== nearby;
      if (marker.hidden) continue;
      const [x,y,depth] = project(stop.marker);
      marker.style.left = x + 'px';
      marker.style.top = y + 'px';
      marker.style.zIndex = Math.round(depth*4+35);
    }
  }
  function showFallback() {
    island = null;
    if (walkMode && active === -1) goHome();
    walkMode = false;
    setBackLabel('回到画外');
    $('moment').removeAttribute('aria-keyshortcuts');
    $('markers').hidden = true;
    $('render-error').hidden = false;
    canvas.hidden = true;
    $('motion-toggle').hidden = true;
    $('explore').replaceChildren('翻开故事 ', $('explore').querySelector('svg'));
  }
  try {
    island = window.createIsland(canvas,updateMarkers,positionWalker);
    canvas.addEventListener('islandunavailable',showFallback);
    canvas.addEventListener('islandarrival',() => {
      if (document.body.dataset.view === 'entering') finishWalk();
    });
  } catch (error) {
    console.warn('The 3D island could not start.',error);
    showFallback();
  }

  function markSelection() {
    items.forEach(({button,marker},index) => {
      button.setAttribute('aria-pressed',String(active === index));
      marker.setAttribute('aria-pressed',String(active === index));
    });
  }
  function positionWalker(x,z) {
    let closest = -1, distance = nearby === -1 ? 1.23 : 1.32;
    for (const [index,{approach:[px,pz]}] of stops.entries()) {
      const separation = Math.hypot(x-px,z-pz);
      if (separation >= distance) continue;
      closest = index;
      distance = separation;
    }
    if (closest !== nearby) showNearby(closest);
  }
  function showNearby(index) {
    if (nearby !== -1) items[nearby].marker.classList.remove('nearby');
    nearby = index;
    $('walk-use').disabled = index === -1;
    if (index === -1) {
      $('walk-nearby').textContent = '沿小径走走，靠近一个地点就能停下来。';
      return;
    }
    items[index].marker.classList.add('nearby');
    $('walk-nearby').textContent = '已到' + stops[index].place + '，可以互动。';
    $('walk-use').setAttribute('aria-label','互动 · ' + stops[index].place);
  }
  function startWalk() {
    if (!island) {
      openStop(0);
      return;
    }
    const view = document.body.dataset.view;
    if (view === 'entering') return;
    walkMode = true;
    active = -1;
    story.hidden = true;
    markSelection();
    showNearby(-1);
    if (island.walk(view === 'entry')) {
      setView('entering');
      $('explore').disabled = true;
      return;
    }
    finishWalk();
  }
  function setView(view) {
    document.body.dataset.view = view;
    $('open-menu').hidden = view === 'entry' || view === 'entering';
  }
  function finishWalk() {
    setView('walk');
    intro.hidden = true;
    walking.hidden = false;
    $('walk-controls').hidden = false;
    canvas.setAttribute('aria-label','3D 岛屿，按 W、A、S、D 或方向键行走，按 E 互动');
    canvas.focus({preventScroll:true});
    if (!guideShown) {
      guideShown = true;
      setTimeout(hideGuide,5800);
    }
  }
  function hideGuide() {
    document.body.dataset.guide = 'off';
  }
  function hideWalk() {
    walking.hidden = true;
    $('walk-controls').hidden = true;
    canvas.setAttribute('aria-label','3D 岛屿，使用左右方向键旋转');
    clearMovement();
  }
  function openStop(index) {
    if (menu.open) menu.close();
    active = index;
    noteIndex = 0;
    const stop = stops[index];
    intro.hidden = true;
    story.hidden = false;
    hideWalk();
    setView('story');
    setBackLabel(walkMode ? '继续散步' : '回到画外');
    $('story-kicker').replaceChildren(document.createElement('span'),stop.place);
    $('story-title').textContent = stop.title;
    $('story-text').textContent = stop.text;
    $('story-quote').textContent = stop.quote;
    $('moment').textContent = stop.action;
    $('record-player').hidden = stop.id !== 'listen';
    if (stop.id !== 'listen') $('record-audio').pause();
    if (walkMode) $('moment').setAttribute('aria-keyshortcuts','E');
    else $('moment').removeAttribute('aria-keyshortcuts');
    $('write-note').hidden = stop.id !== 'create';
    $('moment-note').textContent = '';
    markSelection();
    island?.focus(stop);
    if (stop.id === 'rest') island?.act('rest');
    $('story-title').focus({preventScroll:true});
  }
  function goHome() {
    if (menu.open) menu.close();
    walkMode = false;
    active = -1;
    hideWalk();
    story.hidden = true;
    intro.hidden = false;
    $('explore').disabled = false;
    setView('entry');
    markSelection();
    island?.reset();
    $('explore').focus({preventScroll:true});
  }
  function leaveStory() {
    if (walkMode) startWalk();
    else goHome();
  }
  function setBackLabel(label) {
    const button = $('back');
    button.replaceChildren(button.querySelector('svg'),' '+label);
  }
  function openMenu() {
    if (menu.open || $('open-menu').hidden) return;
    clearMovement();
    menu.showModal();
  }
  $('home').addEventListener('click',goHome);
  $('back').addEventListener('click',leaveStory);
  $('open-menu').addEventListener('click',openMenu);
  $('close-menu').addEventListener('click',() => menu.close());
  menu.addEventListener('close',() => {
    if (!journal.open && document.body.dataset.view === 'walk') canvas.focus({preventScroll:true});
  });
  $('explore').addEventListener('click',startWalk);
  $('next').addEventListener('click',() => openStop((active+1)%stops.length));
  const recordAudio = $('record-audio');
  const recordFile = $('record-file');
  const recordStatus = $('record-status');
  const onlineRecord = $('online-record');
  const onlineRecordSource = $('online-record-source');
  const onlineRecordIds = ['USUAN1100787', 'USUAN1100786', 'USUAN1100785'];
  let recordUrl;
  let playingOnline = false;

  function setRecord(src, title, online) {
    recordAudio.pause();
    if (recordUrl) URL.revokeObjectURL(recordUrl);
    recordUrl = online ? undefined : src;
    playingOnline = online;
    recordAudio.src = src;
    recordAudio.hidden = false;
    recordStatus.hidden = false;
    recordStatus.textContent = title;
  }

  async function playOnlineRecord() {
    const number = onlineRecord.selectedIndex + 1;
    const src = `https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%20${number}.mp3`;
    setRecord(src, onlineRecord.selectedOptions[0].textContent, true);
    try {
      await recordAudio.play();
    } catch (error) {
      if (error.name !== 'AbortError' && recordAudio.src === src) {
        recordStatus.textContent = '暂时无法播放这首在线曲目，请重试或选择其他曲目。';
      }
    }
  }

  $('play-online-record').addEventListener('click', playOnlineRecord);
  onlineRecord.addEventListener('change', () => {
    onlineRecordSource.href = `https://incompetech.com/music/royalty-free/index.html?isrc=${onlineRecordIds[onlineRecord.selectedIndex]}`;
    if (playingOnline) playOnlineRecord();
  });
  recordAudio.addEventListener('ended', () => {
    if (!playingOnline || $('record-player').hidden || onlineRecord.selectedIndex >= onlineRecord.options.length - 1) return;
    onlineRecord.selectedIndex++;
    onlineRecord.dispatchEvent(new Event('change'));
  });

  $('import-record').addEventListener('click', () => recordFile.click());
  recordFile.addEventListener('change', () => {
    const file = recordFile.files[0];
    if (!file) return;
    setRecord(URL.createObjectURL(file), file.name, false);
    recordFile.value = '';
  });
  recordAudio.addEventListener('error', () => {
    recordStatus.textContent = playingOnline
      ? '暂时无法播放这首在线曲目，请重试或选择其他曲目。'
      : '无法播放此文件，请换一首或试试 MP3、WAV 格式。';
  });
  recordAudio.addEventListener('play', () => {
    for (const oscillator of melody) oscillator.stop();
    melody = [];
  });

  $('moment').addEventListener('click',async () => {
    const stop = stops[active];
    island?.act(stop.id);
    if (stop.id === 'rest') setClock(clock+18);
    $('moment-note').textContent = stop.notes[noteIndex++%stop.notes.length];
    if (stop.id === 'listen') {
      recordAudio.pause();
      try {
        await playMelody();
      } catch {
        if (stops[active] === stop) $('moment-note').textContent = '浏览器暂时无法播放声音。';
      }
    } else if (wind) {
      playCue(stop.id);
    }
  });
  $('motion-toggle').addEventListener('click',event => {
    const button = event.currentTarget;
    const paused = button.getAttribute('aria-pressed') === 'false';
    button.setAttribute('aria-pressed',String(paused));
    button.title = paused ? '继续岛上时间和环境动画' : '暂停岛上时间和环境动画';
    $('motion-label').textContent = paused ? '继续时间' : '暂停时间';
    button.querySelector('use').setAttribute('href',paused ? '#play' : '#pause');
    island?.pauseAmbient(paused);
    clockPaused = paused;
    clockAt = performance.now();
  });

  let drag;
  canvas.addEventListener('pointerdown',event => {
    if (!island || document.body.dataset.view === 'entering' || event.button !== 0 || !event.isPrimary) return;
    drag = {id:event.pointerId,x:event.clientX};
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove',event => {
    if (drag?.id !== event.pointerId) return;
    island?.rotate((drag.x-event.clientX)*.009);
    drag.x = event.clientX;
  });
  canvas.addEventListener('lostpointercapture',() => {
    drag = null;
    canvas.classList.remove('dragging');
  });
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label','3D 岛屿，使用左右方向键旋转');
  canvas.addEventListener('keydown',event => {
    if (!walking.hidden || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    island?.rotate(event.key === 'ArrowLeft' ? -.19 : .19);
  });
  function updateMovement() {
    const heading = new Set([...Array.from(pressed,code => movementKeys[code]),...touchMoves.values()]);
    let x = 0, z = 0;
    for (const direction of heading) {
      x += directions[direction][0];
      z += directions[direction][1];
    }
    if (x || z) hideGuide();
    island?.move(Math.sign(x),Math.sign(z));
  }
  function clearMovement() {
    menuShortcutPending = false;
    pressed.clear();
    touchMoves.clear();
    island?.move(0,0);
  }
  function useNearby() {
    if (!walking.hidden && nearby !== -1) openStop(nearby);
  }
  document.addEventListener('keydown',event => {
    if (journal.open || menu.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') {
      if (active !== -1) {
        event.preventDefault();
        leaveStory();
      } else if (document.body.dataset.view === 'walk') {
        event.preventDefault();
        menuShortcutPending = true;
      }
      return;
    }
    if (event.code === 'KeyE' && walkMode && active !== -1) {
      event.preventDefault();
      if (!event.repeat) $('moment').click();
      return;
    }
    if (walking.hidden) return;
    if (event.code === 'KeyE') {
      event.preventDefault();
      if (!event.repeat) useNearby();
    } else if (movementKeys[event.code]) {
      event.preventDefault();
      pressed.add(event.code);
      updateMovement();
    }
  });
  document.addEventListener('keyup',event => {
    if (event.key === 'Escape' && menuShortcutPending) {
      event.preventDefault();
      menuShortcutPending = false;
      openMenu();
    }
    if (pressed.delete(event.code)) updateMovement();
  });
  window.addEventListener('blur',clearMovement);
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) clearMovement();
  });
  $('walk-use').addEventListener('click',useNearby);
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('pointerdown',event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touchMoves.set(event.pointerId,button.dataset.move);
      updateMovement();
    });
    button.addEventListener('lostpointercapture',event => {
      if (touchMoves.delete(event.pointerId)) updateMovement();
    });
  }
  function setSeason(index) {
    season = index;
    $('season-select').value = String(index);
    island?.season(index);
  }
  function setClock(minute) {
    if (minute >= 1440) setSeason((season+Math.floor(minute/1440))%4);
    clock = minute%1440;
    const whole = Math.floor(clock);
    $('time-label').textContent = [Math.floor(whole/60),whole%60].map(value => String(value).padStart(2,'0')).join(':');
    const index = times.findLastIndex(time => whole >= time.minute);
    if (index !== timeIndex) {
      timeIndex = index;
      const {name,theme,color} = times[index];
      $('light-label').textContent = name;
      document.documentElement.dataset.light = theme;
      document.querySelector('meta[name="theme-color"]').content = color;
    }
    island?.time(clock);
  }
  $('season-select').addEventListener('change',event => setSeason(Number(event.currentTarget.value)));
  $('light-toggle').addEventListener('click',() => setClock(times[timeIndex+1]?.minute ?? 1440));
  setClock(clock);
  setSeason(season);
  setInterval(() => {
    const now = performance.now();
    if (!clockPaused && !document.hidden) setClock(clock+Math.min(now-clockAt,1500)/1000);
    clockAt = now;
  },500);

  function openJournal() {
    if (menu.open) menu.close();
    clearMovement();
    try {
      journalText.value = localStorage.getItem(journalKey) ?? '';
      journalStatus.textContent = '便笺保存在当前浏览器。';
    } catch {
      journalStatus.textContent = '当前浏览器无法保存便笺。';
    }
    journal.showModal();
    journalText.focus();
  }
  $('open-journal').addEventListener('click',openJournal);
  $('write-note').addEventListener('click',openJournal);
  $('close-journal').addEventListener('click',() => journal.close());
  $('journal-form').addEventListener('submit',event => {
    event.preventDefault();
    try {
      localStorage.setItem(journalKey,journalText.value);
      journalStatus.textContent = '已保存。';
    } catch {
      journalStatus.textContent = '保存失败，仍可复制这段文字。';
    }
  });

  async function audioContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio is unavailable');
    audio ??= new Audio();
    if (audio.state !== 'running') await audio.resume();
    return audio;
  }
  function startWind(context) {
    const buffer = context.createBuffer(1,context.sampleRate*3,context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random()*2-1;
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    const swell = context.createOscillator();
    const depth = context.createGain();
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    swell.frequency.value = .19;
    depth.gain.value = .026;
    swell.connect(depth).connect(volume.gain);
    noise.connect(filter).connect(volume).connect(context.destination);
    volume.gain.setValueAtTime(.001,context.currentTime);
    volume.gain.linearRampToValueAtTime(.139,context.currentTime+.6);
    noise.start();
    swell.start();
    return () => {
      const now = context.currentTime;
      volume.gain.cancelAndHoldAtTime(now);
      volume.gain.linearRampToValueAtTime(0,now+.20);
      noise.stop(now+.22);
      swell.stop(now+.22);
    };
  }
  $('sound-toggle').addEventListener('click',async event => {
    const button = event.currentTarget;
    if (wind) {
      wind();
      wind = null;
    } else {
      button.disabled = true;
      try {
        wind = startWind(await audioContext());
        button.querySelector('span').textContent = '环境音';
      } catch {
        button.querySelector('span').textContent = '声音不可用';
      } finally {
        button.disabled = false;
      }
    }
    button.setAttribute('aria-pressed',String(Boolean(wind)));
    button.querySelector('use').setAttribute('href',wind ? '#sound' : '#mute');
  });
  async function playMelody() {
    const context = await audioContext();
    for (const oscillator of melody) oscillator.stop();
    melody = [];
    const phrase = [[62,0],[69,.54],[74,1.16],[76,1.85],[73,2.45],[69,3.08],[66,3.62],[62,4.32],[57,4.40]];
    for (const [note,timing] of phrase) {
      const oscillators = melody;
      const tone = playTone(context,440*2**((note-69)/12),timing+.34,1.45,.115,'triangle');
      oscillators.push(tone);
      tone.onended = () => {
        const index = oscillators.indexOf(tone);
        if (index !== -1) oscillators.splice(index,1);
      };
    }
  }
  function playTone(context,frequency,delay,length,peak,type = 'sine') {
    const start = context.currentTime+delay;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = type;
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(.0001,start);
    volume.gain.exponentialRampToValueAtTime(peak,start+.028);
    volume.gain.exponentialRampToValueAtTime(.0001,start+length);
    tone.connect(volume).connect(context.destination);
    tone.start(start);
    tone.stop(start+length+.012);
    return tone;
  }
  function playCue(stop) {
    if (stop === 'rest') {
      for (const [frequency,delay] of [[510,.22],[410,.39],[328,.60]]) playTone(audio,frequency,delay,.48,.038);
      return;
    }
    if (stop === 'together') {
      playTone(audio,246,.45,.22,.032,'triangle');
      return;
    }
    const length = stop === 'create' ? 1.64 : .56;
    const delay = stop === 'create' ? .40 : .28;
    const buffer = audio.createBuffer(1,Math.ceil(audio.sampleRate*length),audio.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const progress = index/samples.length;
      const texture = stop === 'create' ? .3+.7*Math.sin(progress*20)**2 : 1;
      samples[index] = (Math.random()*2-1)*Math.sin(Math.PI*progress)*texture;
    }
    const brush = audio.createBufferSource();
    const band = audio.createBiquadFilter();
    const gain = audio.createGain();
    brush.buffer = buffer;
    band.type = 'bandpass';
    band.frequency.value = stop === 'create' ? 930 : 1600;
    band.Q.value = .9;
    gain.gain.value = .11;
    brush.connect(band).connect(gain).connect(audio.destination);
    brush.start(audio.currentTime+delay);
  }
})();
