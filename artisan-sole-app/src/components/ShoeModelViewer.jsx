/**
 * ShoeModelViewer — echtes 3D-Modell eines Schuhs, zum Drehen mit der Maus
 * oder dem Finger.
 *
 * Die bisherige „3D-Ansicht" war keine: Sie kippte das flache Produktfoto per
 * CSS-Perspektive um die Hochachse. Aus jedem Winkel außer frontal sah man
 * dadurch ein verzerrtes Bild statt eines gedrehten Schuhs.
 *
 * three.js liegt ohnehin im Projekt (Fußscan), der Betrachter wird aber nur
 * geladen, wenn ein Modell hinterlegt ist — sonst trüge jede Produktseite die
 * Last mit, ohne sie je zu brauchen.
 */
import { useEffect, useRef, useState } from 'react'

export default function ShoeModelViewer({ src, className = '' }) {
  const mountRef = useRef(null)
  const [status, setStatus] = useState('loading')   // loading | ready | error

  useEffect(() => {
    if (!src || !mountRef.current) return
    const mount = mountRef.current
    let disposed = false
    let renderer, scene, camera, frame, model
    const drag = { on: false, x: 0, rot: 0 }

    async function boot() {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      if (disposed) return

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      mount.appendChild(renderer.domElement)

      // Weiches, neutrales Licht — der Schuh soll aussehen wie im Studio,
      // nicht wie in einem Spiel.
      scene.add(new THREE.AmbientLight(0xffffff, 1.1))
      const key = new THREE.DirectionalLight(0xffffff, 1.6)
      key.position.set(3, 5, 4)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffffff, 0.6)
      fill.position.set(-4, 2, -3)
      scene.add(fill)

      try {
        const gltf = await new GLTFLoader().loadAsync(src)
        if (disposed) return
        model = gltf.scene

        // Auf eine bekannte Größe normieren und zentrieren: hochgeladene
        // Modelle kommen in beliebigen Maßstäben und Ursprüngen, ohne das
        // steht der Schuh mal winzig, mal außerhalb des Bildes.
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        model.position.sub(center)
        model.scale.setScalar(1.6 / maxDim)
        scene.add(model)
        camera.position.set(0, 0.35, 4)
        camera.lookAt(0, 0, 0)
        setStatus('ready')
      } catch {
        if (!disposed) setStatus('error')
        return
      }

      const render = () => { frame = requestAnimationFrame(render); renderer.render(scene, camera) }
      render()
    }

    const onResize = () => {
      if (!renderer || !camera || !mount.clientWidth) return
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    const down = (e) => { if (!model) return; drag.on = true; drag.x = e.clientX; drag.rot = model.rotation.y }
    const move = (e) => { if (!drag.on || !model) return; model.rotation.y = drag.rot + (e.clientX - drag.x) * 0.01 }
    const up = () => { drag.on = false }
    mount.addEventListener('pointerdown', down)
    mount.addEventListener('pointermove', move)
    mount.addEventListener('pointerup', up)
    mount.addEventListener('pointerleave', up)

    boot()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      ro.disconnect()
      mount.removeEventListener('pointerdown', down)
      mount.removeEventListener('pointermove', move)
      mount.removeEventListener('pointerup', up)
      mount.removeEventListener('pointerleave', up)
      // Grafikspeicher freigeben — ohne das sammeln sich beim Blättern durch
      // mehrere Modelle verwaiste WebGL-Kontexte an, und der Browser gibt
      // irgendwann keine neuen mehr aus.
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
      scene?.traverse(o => {
        o.geometry?.dispose?.()
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : [])
        mats.forEach(m => m.dispose?.())
      })
    }
  }, [src])

  return (
    <div className={`absolute inset-0 ${className}`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-black/35 uppercase tracking-[0.2em]">
            {status === 'error' ? '3D-Modell nicht ladbar' : '3D-Modell wird geladen …'}
          </span>
        </div>
      )}
    </div>
  )
}
