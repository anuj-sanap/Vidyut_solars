let scene;
let camera;
let renderer;
let controls;
let panelGroup;
let animationFrameId = null;
let stream = null;
let cameraDevices = [];

function setFallback(message) {
  const canvasWrap = document.querySelector("#canvasWrap");
  const fallback = document.querySelector("#fallbackPreview");
  const note = document.querySelector("#previewNote");
  canvasWrap.classList.add("hidden");
  fallback.classList.remove("hidden");
  note.textContent = message;
}

function createPanelGrid(THREE, systemSize) {
  const group = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.3, roughness: 0.5 });
  const panelGeo = new THREE.BoxGeometry(1.1, 0.05, 0.75);
  const panelCount = Math.max(2, Number(systemSize) * 2);
  const cols = Math.ceil(Math.sqrt(panelCount));

  for (let i = 0; i < panelCount; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(col * 1.25 - (cols - 1) * 0.625, 0.28, row * 0.95 - 1.1);
    panel.rotation.x = -0.32;
    group.add(panel);
  }
  return group;
}

function updateStatus(message) {
  const note = document.querySelector("#previewNote");
  if (note) note.textContent = message;
}

function updateCameraHelp(message) {
  const helpEl = document.querySelector("#cameraHelp");
  if (!helpEl) return;
  if (!message) {
    helpEl.classList.add("hidden");
    helpEl.textContent = "";
    return;
  }
  helpEl.classList.remove("hidden");
  helpEl.textContent = message;
}

function updateDiagnostics(lines) {
  const el = document.querySelector("#cameraDiagnostics");
  if (!el) return;
  const content = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
  if (!content) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.classList.remove("hidden");
  el.textContent = content;
}

async function loadCameraDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraDevices = devices.filter((d) => d.kind === "videoinput");
    return cameraDevices;
  } catch (_) {
    return [];
  }
}

function stopCamera(videoEl) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (videoEl && videoEl.srcObject) videoEl.srcObject = null;
  updateStatus("Realtime preview stopped.");
}

function resizeRenderer(canvasEl) {
  if (!renderer || !camera || !canvasEl) return;
  const width = canvasEl.clientWidth || 600;
  const height = canvasEl.clientHeight || 420;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updatePanelTransform() {
  const dragX = document.querySelector("#panelX");
  const dragZ = document.querySelector("#panelZ");
  const rotate = document.querySelector("#panelRotate");
  if (!panelGroup || !dragX || !dragZ || !rotate) return;
  panelGroup.position.x = Number(dragX.value);
  panelGroup.position.z = Number(dragZ.value);
  panelGroup.rotation.y = Number(rotate.value) * (Math.PI / 180);
}

function replacePanelGrid(THREE) {
  const systemSizeEl = document.querySelector("#previewSystemSize");
  const selectedSize = Number(systemSizeEl ? systemSizeEl.value : 1) || 1;
  if (panelGroup) {
    scene.remove(panelGroup);
    panelGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  panelGroup = createPanelGrid(THREE, selectedSize);
  scene.add(panelGroup);
  updatePanelTransform();
  updateStatus(`Realtime preview running for ${selectedSize} kW.`);
}

async function startCamera(videoEl, selectedSize) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateStatus("Camera API unavailable. Use HTTPS or localhost and allow camera permission.");
    updateCameraHelp("Tip: Open this page using https://... or http://localhost:3000, then allow Camera in browser permissions.");
    return;
  }
  try {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    const preferredConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };
    const primaryDeviceConstraint =
      cameraDevices.length > 0
        ? {
            video: { deviceId: { exact: cameraDevices[0].deviceId } },
            audio: false,
          }
        : null;
    const relaxedConstraints = {
      video: true,
      audio: false,
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
    } catch (_) {
      try {
        if (!primaryDeviceConstraint) throw new Error("no-device-constraint");
        stream = await navigator.mediaDevices.getUserMedia(primaryDeviceConstraint);
      } catch (_) {
        stream = await navigator.mediaDevices.getUserMedia(relaxedConstraints);
      }
    }

    videoEl.muted = true;
    videoEl.setAttribute("playsinline", "");
    videoEl.srcObject = stream;
    await videoEl.play();
    const settings = stream.getVideoTracks()[0] ? stream.getVideoTracks()[0].getSettings() : {};
    updateStatus(`Realtime preview running for ${selectedSize} kW.`);
    updateDiagnostics([
      `Secure context: ${window.isSecureContext}`,
      `Protocol: ${window.location.protocol}`,
      `Host: ${window.location.host}`,
      `Detected cameras: ${cameraDevices.length}`,
      `Active camera: ${settings.label || "unknown"}`,
      `Resolution: ${settings.width || "?"}x${settings.height || "?"}`,
    ]);
    updateCameraHelp("");
  } catch (error) {
    const errorName = error && error.name ? error.name : "CameraError";
    if (errorName === "NotAllowedError") {
      updateStatus("Camera permission denied. Allow camera in browser site settings, then retry.");
      updateCameraHelp("How to fix: Click the lock icon in the address bar > Site settings > Camera > Allow. Then refresh and click Start again.");
      updateDiagnostics([
        `Error: ${errorName}`,
        `Secure context: ${window.isSecureContext}`,
        `Protocol: ${window.location.protocol}`,
        `Host: ${window.location.host}`,
      ]);
      return;
    }
    if (errorName === "NotFoundError") {
      updateStatus("No camera device found on this system.");
      updateCameraHelp("No webcam detected. Connect a camera (or check OS privacy settings), then retry.");
      updateDiagnostics([`Error: ${errorName}`, `Detected cameras: ${cameraDevices.length}`]);
      return;
    }
    if (errorName === "NotReadableError") {
      updateStatus("Camera is busy in another app. Close other camera apps and retry.");
      updateCameraHelp("Close Zoom/Meet/Camera app or any software using webcam, then click Start again.");
      updateDiagnostics([`Error: ${errorName}`, "Another app is locking the webcam device."]);
      return;
    }
    if (errorName === "SecurityError") {
      updateStatus("Camera blocked by browser security. Open this page on HTTPS or localhost.");
      updateCameraHelp("Use secure origin: https://your-domain or http://localhost:3000. Camera is blocked on insecure pages.");
      updateDiagnostics([`Error: ${errorName}`, `Secure context: ${window.isSecureContext}`, `Protocol: ${window.location.protocol}`]);
      return;
    }
    updateStatus(`Unable to start camera (${errorName}).`);
    updateCameraHelp(`Camera error: ${errorName}. Try refresh page, allow permission, and ensure no other app is using webcam.`);
    updateDiagnostics([
      `Error: ${errorName}`,
      `Message: ${error && error.message ? error.message : "No extra details"}`,
      `Secure context: ${window.isSecureContext}`,
      `Protocol: ${window.location.protocol}`,
      `Host: ${window.location.host}`,
      `Detected cameras: ${cameraDevices.length}`,
    ]);
  }
}

function bindControlListeners(THREE, videoEl, canvasEl) {
  const dragX = document.querySelector("#panelX");
  const dragZ = document.querySelector("#panelZ");
  const rotate = document.querySelector("#panelRotate");
  const systemSize = document.querySelector("#previewSystemSize");
  const startBtn = document.querySelector("#startRealtime3d");
  const stopBtn = document.querySelector("#stopRealtime3d");

  [dragX, dragZ, rotate].forEach((input) => {
    if (input) input.addEventListener("input", updatePanelTransform);
  });
  if (systemSize) {
    systemSize.addEventListener("change", () => replacePanelGrid(THREE));
  }
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      const selectedSize = Number(systemSize ? systemSize.value : 1) || 1;
      updateStatus("Requesting camera access...");
      updateCameraHelp("");
      await startCamera(videoEl, selectedSize);
      replacePanelGrid(THREE);
      resizeRenderer(canvasEl);
    });
  }
  if (stopBtn) {
    stopBtn.addEventListener("click", () => stopCamera(videoEl));
  }
}

function tryPreloadCalculatorSelection() {
  try {
    const raw = localStorage.getItem("solarCalculatorResult");
    if (!raw) return;
    const data = JSON.parse(raw);
    const systemSize = Number(data.systemSize) || 1;
    const select = document.querySelector("#previewSystemSize");
    if (select) select.value = String(systemSize);
  } catch (_) {
    // no-op
  }
}

async function init3D() {
  try {
    if (!window.THREE) {
      setFallback("3D engine could not load. Static preview is shown.");
      return;
    }

    const THREE = window.THREE;
    const OrbitControls = window.THREE.OrbitControls;
    const canvasEl = document.querySelector("#previewCanvas");
    const videoEl = document.querySelector("#previewVideo");
    if (!canvasEl || !videoEl) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(4, 5, 8);

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    if (OrbitControls) {
      controls = new OrbitControls(camera, canvasEl);
      controls.enableDamping = true;
      controls.minDistance = 4;
      controls.maxDistance = 16;
    } else {
      controls = { update() {} };
      updateStatus("3D loaded (basic mode). Camera can still be started.");
    }

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(5, 8, 5);
    scene.add(sun);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.95 })
    );
    roof.position.y = 0;
    scene.add(roof);

    tryPreloadCalculatorSelection();
    await loadCameraDevices();
    replacePanelGrid(THREE);
    bindControlListeners(THREE, videoEl, canvasEl);
    resizeRenderer(canvasEl);

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    if (window.isSecureContext) {
      updateStatus("3D ready. Click Start Camera + 3D.");
    } else {
      updateStatus("3D ready. For camera, open via HTTPS or localhost.");
    }
    updateDiagnostics([
      `Secure context: ${window.isSecureContext}`,
      `Protocol: ${window.location.protocol}`,
      `Host: ${window.location.host}`,
      `Detected cameras: ${cameraDevices.length}`,
      "Click Start Camera + 3D to request permission.",
    ]);

    window.addEventListener("resize", () => resizeRenderer(canvasEl));
    window.addEventListener("beforeunload", () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stopCamera(videoEl);
    });
  } catch (_) {
    setFallback("3D engine could not load. Static preview is shown.");
  }
}

document.addEventListener("DOMContentLoaded", init3D);
