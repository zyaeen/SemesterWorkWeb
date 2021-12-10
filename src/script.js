import './style.css'
import * as THREE from 'three'
import {gsap} from "gsap";

import {Elastic, Bounce, SteppedEase} from "gsap/all";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import * as dat from 'lil-gui'
import {FontLoader} from "three/examples/jsm/loaders/FontLoader";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry"
import {PointLight} from "three";

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'

// Needed vars

let scene,
    camera,
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane,
    renderer,
    tardis,
    rocket,
    HEIGHT,
    WIDTH,
    buffer_cube_one,
    buffer_cube_two,
    controls;

// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene

scene = new THREE.Scene();

// Tardis flying params

let ship_params = {};
ship_params['y_speed'] = 3;
ship_params['orbit'] = 700;
ship_params['size'] = 0.5


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const parameters = {}
parameters.count = 10000
parameters.size = 0.01
parameters.radius = 10000
parameters.branches = 3
parameters.spin = 1
parameters.randomness = 0.2
parameters.randomnessPower = 4
parameters.insideColor = '#ff6030'
parameters.outsideColor = '#1b3984'

let geometry = null
let material = null
let points = null

// Planets

let sun
let mercury
let venus
let earth
let mars
let jupiter
let saturn
let uranus
let neptune
let pluto

let cloudParticles = [], flash, cloud;
let text;

const textureLoader = new THREE.TextureLoader();


window.addEventListener('dblclick', ()=>{
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement
    if(!fullscreenElement){
        if(renderer.domElement.requestFullscreen) {
            renderer.domElement.requestFullscreen()
        } else if(renderer.domElement.webkitRequestFullscreen){
            renderer.domElement.webkitRequestFullscreen()
        }
    } else{
        if(document.exitFullscreen) {
            document.exitFullscreen()
        } else if(document.webkitExitFullscreen){
            document.webkitExitFullscreen()
        }
    }
})

const textures = {

    starsTexture: "https://i.imgur.com/gLGNnkp.jpeg",
    sunTexture: "https://i.imgur.com/zU5oOjt.jpeg",
    mercuryTexture: "https://i.imgur.com/TJO6Te3.jpeg",
    venusTexture: "https://i.imgur.com/xeaPIjD.jpeg",
    earthTexture: "https://i.imgur.com/vflkkqF.jpeg",
    marsTexture: "https://i.imgur.com/U6upjrv.jpeg",
    jupiterTexture: "https://i.imgur.com/4APG00k.jpeg",
    saturnTexture: "https://i.imgur.com/YKw0m4x.jpeg",
    saturnRingTexture: "https://i.imgur.com/u0muMiZ.png",
    uranusTexture: "https://i.imgur.com/olpgGMo.jpeg",
    uranusRingTexture: "https://i.imgur.com/F1y9Ve4.png",
    neptuneTexture: "https://i.imgur.com/pycXdLM.jpeg",
    plutoTexture:  "https://i.imgur.com/YNsmmHV.jpeg",

}
let rot = false;
rot = true;


function create_planet(size, texture, position, ring, ring_angle) {
    const geo = new THREE.SphereGeometry(size, 30, 30);
    const mat = new THREE.MeshStandardMaterial({
        map: textureLoader.load(texture)
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow  = true
    mesh.receiveShadow = true
    const obj = new THREE.Object3D();
    obj.add(mesh);
    if (ring) {
        const ringGeo = new THREE.RingGeometry(
            ring.innerRadius,
            ring.outerRadius,
            32
        );
        // texture.receiveShadow = true;
        const ringMat = new THREE.MeshStandardMaterial({
            map: textureLoader.load(ring.texture),
            side: THREE.DoubleSide,
        });
        ringMat.transparent = false
        ringMat.side = THREE.DoubleSide
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.receiveShadow = true
        ringMesh.castShadow = true
        obj.add(ringMesh);
        obj.receiveShadow = true
        ringMesh.position.x = position;
        ringMesh.rotation.y = ring_angle
        ringMesh.rotation.x = -0.5 * Math.PI;
    }
    scene.add(obj);
    mesh.position.x = position;
    return { mesh, obj };
}

const create_sun = () => {

    sun = new THREE.Mesh(
        new THREE.SphereGeometry(200, 30, 30),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load(textures.sunTexture)
        })
    );
    const pointLight = new THREE.PointLight(0xffffff, 2.5, 10000);
    pointLight.castShadow = true
    pointLight.shadow.bias = - 0.005; // reduces self-shadowing on double-sided objects
    pointLight.shadowMapWidth = 1024; // default is 512
    pointLight.shadowMapHeight = 1024;
    // pointLight.shadow.bias()
    sun.add(pointLight)
    // scene.add(
    //     // ambientLight,
    //     // directionalLight,
    //     pointLight
    // );
    scene.add(sun);
}

const generate_galaxy = () => {

    if (points !== null){
        geometry.dispose();
        material.dispose();
        scene.remove(points)
    }

    // Geometries
    geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(parameters.count * 3)
    const colors = new Float32Array(parameters.count * 3)

    const coloriInside = new THREE.Color(parameters.insideColor)
    const colorOutside = new THREE.Color(parameters.outsideColor)

    for (let i=0; i < parameters.count; i++)
    {
        const i3 = i * 3

        const radius = Math.random() * parameters.radius
        const spinAngle = radius * parameters.spin
        const branchAngle = (i % parameters.branches) / parameters.branches * 2 * Math.PI

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius

        positions[i3 ] = Math.cos(branchAngle + spinAngle) * radius + randomX
        positions[i3+1] = randomY
        positions[i3+2] = Math.sin(branchAngle + spinAngle) * radius + randomZ

        const mixedColor = coloriInside.clone()
        mixedColor.lerp(colorOutside, radius / parameters.radius)

        colors[i3] = mixedColor.r
        colors[i3+1] =  mixedColor.g
        colors[i3+2] = mixedColor.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Material

    material = new THREE.PointsMaterial({
        size:parameters.size,
        sizeAttenuation: true,
        depthWhite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    })

    // Points
    points = new THREE.Points(geometry, material)
    scene.add(points)
}


// Creating Tardis

tardis = new THREE.Group()


const create_tardis = () => {

    const main_box = new THREE.Mesh(
        new THREE.BoxGeometry( 120, 200, 120 ),
        new THREE.MeshStandardMaterial({
            color: 0x003865
        })
    );
    main_box.position.y = 50
    // main_box.castShadow = true
    main_box.castShadow = true
    main_box.receiveShadow = true
    tardis.add(main_box)

    const main_material = new THREE.MeshBasicMaterial( {color: 0x003840 } );

    const cover = new THREE.Mesh(
        new THREE.BoxGeometry( 100, 20, 100 ),
        main_material
    )
    cover.castShadow = true
    cover.receiveShadow = true
    cover.position.y = 155;
    tardis.add(cover)

    const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 5, 10, 32),
        new THREE.MeshLambertMaterial({
            color: 0xffff00, metalness: 0.9
        })
    );
    lantern.position.y = 170

    // const lmp = new PointLight(0x062d89, 30, 10 ,1.7);
    // lmp.position.y = 100;
    // tardis.add(lmp)

    tardis.add(lantern)

    const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(5, 5, 10),
        new THREE.MeshLambertMaterial({
            color: 0xffff00, metalness: 0.9
        })
    );
    lamp.position.y = 175
    tardis.add(lamp)

    // Windows

    const window1 = new THREE.BoxGeometry( 126, 40, 35 );
    const materialWindow = new THREE.MeshBasicMaterial( {color: 0xFFFFFF} );
    buffer_cube_one = new THREE.Mesh( window1, materialWindow );
    buffer_cube_one.position.y = 110
    buffer_cube_one.position.z = 30
    buffer_cube_two = new THREE.Mesh( window1, materialWindow );
    buffer_cube_two.position.y = 110
    buffer_cube_two.position.z = -30
    tardis.add(buffer_cube_two)
    tardis.add(buffer_cube_one)

    const window2 = new THREE.BoxGeometry( 35, 40, 126 );
    buffer_cube_one = new THREE.Mesh( window2, materialWindow );
    buffer_cube_one.position.y = 110
    buffer_cube_one.position.x = 30
    buffer_cube_two = new THREE.Mesh( window2, materialWindow );
    buffer_cube_two.position.y = 110
    buffer_cube_two.position.x = -30
    tardis.add(buffer_cube_two)
    tardis.add(buffer_cube_one)

    // Door cubes

    buffer_cube_one = new THREE.Mesh( window1, main_material );
    buffer_cube_one.position.y = 50
    buffer_cube_one.position.z = 30
    buffer_cube_two = new THREE.Mesh( window1, main_material );
    buffer_cube_two.position.y = 50
    buffer_cube_two.position.z = -30
    tardis.add(buffer_cube_two)
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh( window1, main_material );
    buffer_cube_one.position.y = 0
    buffer_cube_one.position.z = 30
    buffer_cube_two = new THREE.Mesh( window1, main_material );
    buffer_cube_two.position.y = 0
    buffer_cube_two.position.z = -30
    tardis.add(buffer_cube_two)
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh( window2, main_material );
    buffer_cube_one.position.y = 50
    buffer_cube_one.position.x = 30
    buffer_cube_two = new THREE.Mesh( window2, main_material );
    buffer_cube_two.position.y = 50
    buffer_cube_two.position.x = -30
    tardis.add(buffer_cube_two)
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh( window2, main_material );
    buffer_cube_one.position.y = 0
    buffer_cube_one.position.x = 30
    buffer_cube_two = new THREE.Mesh( window2, main_material );
    buffer_cube_two.position.y = 0
    buffer_cube_two.position.x = -30
    tardis.add(buffer_cube_two)
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 134, 198, 8 ),
        main_material
    );
    buffer_cube_one.position.y = 50
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 134, 198, 8 ),
        main_material
    );
    buffer_cube_one.position.y = 50
    buffer_cube_one.position.z = 55
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 134, 198, 8 ),
        main_material
    );
    buffer_cube_one.position.y = 50
    buffer_cube_one.position.z = -55
    tardis.add(buffer_cube_one)


    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 8, 198, 134 ),
        main_material
    );
    buffer_cube_one.position.y = 50
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 8, 198, 134 ),
        main_material
    );
    buffer_cube_one.position.y = 50
    buffer_cube_one.position.x = 55
    tardis.add(buffer_cube_one)

    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 8, 198, 134 ),
        main_material
    );
    buffer_cube_one.position.y = 50
    buffer_cube_one.position.x = -55
    tardis.add(buffer_cube_one)

    buffer_cube_two = new THREE.Mesh(
        new THREE.BoxGeometry( 134, 12, 134 ),
        main_material
    );
    buffer_cube_two.position.y = 145;
    tardis.add(buffer_cube_two)
    buffer_cube_one = new THREE.Mesh(
        new THREE.BoxGeometry( 134, 12, 134 ),
        main_material
    );
    buffer_cube_one.position.y = -50;
    tardis.add(buffer_cube_one)

    tardis.position.x = -400;

}

const load_font = () => {

    const fontLoader = new FontLoader();
    fontLoader.load(
        '/fonts/helvetiker_regular.typeface.json',
        (font) => {
            const textGeometry = new TextGeometry(
                'TARDIS FLYING',
                {
                    font: font,
                    size: 200,
                    height: 0.2,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 50,
                    bevelSize: 0.02,
                    bevelOffset: 0,
                    bevelSegments: 5,
                }
            )
            textGeometry.computeBoundingBox();
            textGeometry.center();
            const matcapTexture = textureLoader.load('/textures/matcaps/3.png')
            const material = new THREE.MeshMatcapMaterial({matcap:matcapTexture});
            text = new THREE.Mesh(textGeometry, material)
            text.position.set(0, 1000, -1000)
            scene.add(text)
        }
    )
}


const make_fog = () => {
    let loader = new THREE.TextureLoader();
    loader.load("https://i.postimg.cc/TYvjnH2F/smoke-2.png", function(texture) {
        const cloudGeo = new THREE.PlaneBufferGeometry(250, 250);
        const cloudMaterial = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true
        });
        for (let p = 0; p < 100; p++) {
            cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
            cloud.position.set(
                Math.sin(Math.random()) * 2000 - 800,
                1000 ,
                Math.random() * (-500) - 800
            );
            cloud.rotation.x = 0;
            cloud.rotation.y = 0;
            // console.log(Math.random())
            cloud.rotation.z = Math.random() * 360;

            cloud.material.opacity = 0.7;
            cloudParticles.push(cloud);
            scene.add(cloud);
        }
    })
    flash = new THREE.PointLight(0x062d89, 30, 1000 ,1.7);
    flash.position.set(200,200,-300);
    scene.add(flash);
}


const createScene = () => {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    aspectRatio = WIDTH / HEIGHT;
    fieldOfView = 60;
    nearPlane = 1;
    farPlane = 1000000;
    camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane
    );


    scene.background = new THREE.CubeTextureLoader()
        .setPath( '/textures/cubeMaps/' )
        .load( [
            'px.png',
            'nx.png',
            'py.png',
            'ny.png',
            'pz.png',
            'nz.png'
        ] );


    camera.position.x = 0;
    camera.position.z = 2000;
    camera.position.y = 200;


    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    load_font()
    make_fog()


    let loader = new GLTFLoader();
    loader.load( "https://www.stivaliserna.com/assets/rocket/rocket.gltf",
        (gltf) => {
            rocket = gltf.scene;
            gltf.scene.scale.set(3/4, 1, 3/4)




            rocket.position.x = 400;
            rocket.rotation.x = -0.5
            rocket.rotation.z = -0.5

            scene.add(rocket);

            gsap.timeline(
                {repeat: -1}
            )
                .set(rocket.rotation, {
                        y: Math.PI * 2,
                        duration:10
                    }
                )
                .from(
                    rocket.position, {
                        x: 0, y: 0, z: 400,
                        rotateX: -25,
                        duration: 1,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.rotation, {
                        x: -0.5, z: -0.5,
                        rotateX: -25,
                        duration: 3,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.position, {
                        x: 1200, y: 1200, z: -1000,
                        rotateX: -25,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.rotation, {
                        x: 0, y: 0, z: 0,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.rotation, {
                        // x: -0.5,
                        // y: 0.5,
                        z: Math.PI/2,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.position, {
                        x: -1200, y: 1200, z: -1000,
                        rotateX: -25,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.rotation, {
                        // x: -0.5,
                        // y: 0.5,
                        z: -0.5,
                        x: 2,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.position, {
                        x: -400, y: 0, z: 0,
                        rotateX: -25,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.rotation, {
                        x: 0, z: 0,
                        duration: 2,
                        ease: 'none'
                    }
                )
                .to(
                    rocket.position, {
                        x: 0, y: 0, z: 400,
                        rotateX: -25,
                        duration: 8,
                        ease: Elastic.easeOut.config(1, 2)
                    }
                )
                .to(
                    rocket.rotation, {
                        x: -0.5, z: -0.5,
                        rotateX: -25,
                        duration: 3,
                        ease: 'none'
                    }
                )
        }
    );

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(
        '#000000'
    )
    renderer.shadowMap.enabled = true
    renderer.shadowMapType = THREE.PCFSoftShadowMap;


    window.addEventListener("resize", handleWindowResize, false);


    scene.add(tardis)

    create_tardis()
    create_sun()

    const distance = 400;

    mercury = create_planet(80, textures.mercuryTexture, 700 + distance);
    venus = create_planet(
        55,
        textures.venusTexture,
        1500 + distance,
        {
            innerRadius: 60,
            outerRadius: 70,
            texture: textures.saturnTexture
        },
        -0.5
    );
    earth = create_planet(60, textures.earthTexture, 2000 + distance);
    mars = create_planet(45, textures.marsTexture, 2500 + distance,
        {
            innerRadius: 80,
            outerRadius: 120,
            texture: textures.jupiterTexture
        },
        0.7
    );
    saturn = create_planet(90, textures.saturnTexture, 3500 + distance,
        {
            innerRadius: 100,
            outerRadius: 130,
            texture: textures.plutoTexture
        },
        -0.2
    );


}

const start_sloar_system = () => {
    sun.rotateY(0.004);
    mercury.mesh.rotateY(0.004);
    venus.mesh.rotateY(0.002);
    earth.mesh.rotateY(0.007);
    mars.mesh.rotateY(0.018);
    saturn.mesh.rotateY(0.0038);

    if (rot) {

        //Around-sun-rotation
        mercury.obj.rotateY(-0.003);
        venus.obj.rotateY(0.0015);
        earth.obj.rotateY(-0.001);
        mars.obj.rotateY(0.0008);
        saturn.obj.rotateY(0.00009);
    }
}

const handleWindowResize = () => {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
};



const target_tardis_position = 40;
const animationDuration = 20000;
const dur = 2000;
function get_new_coordinates(orbit, t) {
    return {
        x: orbit * Math.sin(Math.PI * 2 * t),
        y: orbit * Math.cos(Math.PI * 2 * t)
    }
}



const loop = () => {

    const t = (Date.now() % animationDuration) / animationDuration;
    const t2 = (Date.now() % dur) / dur;

    renderer.render(scene, camera);
    const delta = target_tardis_position * Math.sin(Math.PI * 2 * t);
    if (tardis) {
        tardis.rotateY(ship_params['y_speed'] / 100);
        tardis.position.z =  ship_params['orbit']* Math.cos(Math.PI * 2 * t)
    }

    tardis.scale.set(ship_params['size'], ship_params['size'], ship_params['size'])


    // var position = new THREE.Vector3();
    // position.setFromMatrixPosition( tardis.matrixWorld )
    // controls.target.copy( position  );
    // controls.update();


    cloudParticles.forEach(p => {
        p.rotation.z -=0.01;
    });
    if(Math.random() > 0.93 || flash.power > 100) {
        if(flash.power < 100)
            flash.position.set(
                Math.random()*2000 - 800,
                1000 + Math.random() *200,
                -900
            );
        flash.power = 50 + Math.random() * 500;
    }
    window.requestAnimationFrame(loop);
};

const main = () => {
    createScene();
    generate_galaxy();


    gsap.to(tardis.position, {
        x: 700, y: 1000,
        duration: 10,
        yoyo: true, repeat: -1,
        ease: "power2.inOut" //"strong.inOut"
    });


    renderer.setAnimationLoop(start_sloar_system);

    const mercury_orbit = mercury.mesh.position.x
    const venus_orbit = venus.mesh.position.x
    const earth_orbit = earth.mesh.position.x
    const mars_orbit = mars.mesh.position.x
    const saturn_orbit = saturn.mesh.position.x

    renderer.render(scene, camera);
    gui.add(tardis.position, 'z').min(0).max(1000).step(1);
    gui.add(tardis.rotation, 'x').min(0).max(5).step(0.01);
    gui.add(tardis.rotation, 'z').min(0).max(5).step(0.01);
    gui.add(ship_params, 'y_speed').min(0).max(10).step(0.01);
    gui.add(ship_params, 'orbit').min(40).max(1000).step(20);
    gui.add(ship_params, 'size').min(0.01).max(1).step(0.1);


    gui.add(parameters, 'count').min(100).max(1000000).step(100).onFinishChange(generate_galaxy)
    gui.add(parameters, 'size').min(0.001).max(0.1).step(0.001).onFinishChange(generate_galaxy)
    gui.add(parameters, 'radius').min(0.01).max(20).step(0.01).onFinishChange(generate_galaxy)
    gui.add(parameters, 'branches').min(2).max(20).step(1).onFinishChange(generate_galaxy)
    gui.add(parameters, 'spin').min(-5).max(5).step(0.01).onFinishChange(generate_galaxy)
    gui.add(parameters, 'randomness').min(0).max(2).step(0.01).onFinishChange(generate_galaxy)
    gui.add(parameters, 'randomnessPower').min(1).max(10).step(0.01).onFinishChange(generate_galaxy)
    gui.addColor(parameters, 'insideColor').onFinishChange(generate_galaxy)
    gui.addColor(parameters, 'outsideColor').onFinishChange(generate_galaxy)
    loop();
};

main();
