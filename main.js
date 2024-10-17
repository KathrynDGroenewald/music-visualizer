import * as THREE from 'three'; // Import the Three.js library for 3D rendering

// Get elements from the DOM
const fileInput = document.getElementById('audio');
const fieldSet = document.getElementById('fieldset');
const content = document.getElementById('content');
const playButton = document.getElementById('button');

let audioCtx, analyser, shape; // Declare variables for audio context, analyser, and the visual shape

// Create a Three.js scene
const scene = new THREE.Scene();

// Create a perspective camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // Set camera position

// Create a WebGL renderer and configure it
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size to match window
renderer.setClearColor(0x000000, 1); // Set background color to black
document.body.appendChild(renderer.domElement); // Append renderer to the document

// Add an event listener to the play button
playButton.addEventListener("click", function() {
    if (!audioCtx) { // Initialize audio context and analyser on first click
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 8192; // Set FFT size for frequency analysis
    }

    if (!fileInput.files[0]) { // Ensure an audio file is selected
        alert("Please upload an audio file first.");
        return;
    }

    // Update UI: hide form elements and change background
    fieldSet.remove();
    content.style.display = 'none';
    document.body.style.backgroundColor = 'black';
    renderer.domElement.style.zIndex = '15';

    readFile(); // Read the uploaded audio file
    shape = createSphere(); // Create the 3D sphere for visualization
    scene.add(shape); // Add the sphere to the scene
    animate(); // Start animation loop
});

// Function to create a 3D sphere
function createSphere() {
    const geometry = new THREE.SphereGeometry(1, 64, 64); // Sphere geometry
    const material = new THREE.MeshPhongMaterial({
        color: 0xff69b4, // Pink color
        metalness: 1, // Set material properties for a shiny effect
        roughness: 0.5
    });

    const sphere = new THREE.Mesh(geometry, material); // Combine geometry and material to create mesh

    // Add lighting to the scene
    const light = new THREE.DirectionalLight(0xFFFFFF, 3); // Directional light
    light.position.set(-1, 2, 20); // Position the light
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Ambient light for soft overall lighting
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1); // Point light
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    return sphere;
}

// Function to read and process the audio file
function readFile() {
    const reader = new FileReader();
    reader.onload = function(ev) {
        // Decode audio data and set up sound playback
        audioCtx.decodeAudioData(ev.target.result).then(function(buffer) {
            const soundSource = audioCtx.createBufferSource();
            soundSource.buffer = buffer;
            soundSource.connect(analyser);
            analyser.connect(audioCtx.destination);
            soundSource.start(0); // Start playing the audio
        }).catch(function(err) {
            console.error("Error decoding audio data:", err);
        });
    };
    reader.onerror = function(error) {
        console.error('Error reading file:', error);
    };
    reader.readAsArrayBuffer(fileInput.files[0]); // Read audio file as binary data
}

// Animation loop to update the 3D visualization
function animate() {
    requestAnimationFrame(animate); // Request the next frame of animation

    // Create arrays to hold frequency and time domain data
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeDomainData = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(frequencyData); // Get frequency data
    analyser.getByteTimeDomainData(timeDomainData); // Get time domain data

    // Scale the sphere based on the average frequency
    const radiusScaleFactor = 0.015;
    const waveformScaleFactor = 0.035;

    const averageFrequency = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    shape.scale.setScalar(1 + averageFrequency * radiusScaleFactor);

    // Update the sphere's geometry based on the audio waveform
    const geometry = shape.geometry;
    const positionAttribute = geometry.attributes.position;
    const originalPositions = geometry.userData.originalPositions || positionAttribute.array.slice();
    
    if (!geometry.userData.originalPositions) {
        geometry.userData.originalPositions = originalPositions;
    }
    
    for (let i = 0; i < positionAttribute.count; i++) {
        const index = i * 3;
        const timeDomainValue = timeDomainData[i % timeDomainData.length] / 128 - 1;
        
        // Modify position based on time domain data for wave-like effect
        positionAttribute.array[index] = originalPositions[index] * (1 + timeDomainValue * waveformScaleFactor);
        positionAttribute.array[index + 1] = originalPositions[index + 1] * (1 + timeDomainValue * waveformScaleFactor);
        positionAttribute.array[index + 2] = originalPositions[index + 2] * (1 + timeDomainValue * waveformScaleFactor);
    }

    // Change color of the sphere based on audio volume
    const volume = Math.sqrt(frequencyData.reduce((sum, value) => sum + value * value, 0) / frequencyData.length);
    const volColor = getColorFromVolume(volume);
    shape.material.color.set(volColor);
    
    positionAttribute.needsUpdate = true; // Mark positions as updated

    renderer.render(scene, camera); // Render the scene
}

// Function to calculate color based on volume
function getColorFromVolume(volume) {
    const hue = volume / 255; // Convert volume to hue value
    return new THREE.Color().setHSL(hue, 1, 0.5); // Return color in HSL format
}

// Adjust scene on window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; // Adjust camera aspect ratio
    camera.updateProjectionMatrix(); // Update camera projection
    renderer.setSize(window.innerWidth, window.innerHeight); // Adjust renderer size
}
