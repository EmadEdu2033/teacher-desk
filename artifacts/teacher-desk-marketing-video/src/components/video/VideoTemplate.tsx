import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = {
  open: 4500,
  kinetic: 6000,
  notes: 8500,
  podium: 7000,
  tasks: 5000,
  close: 6000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  kinetic: Scene2,
  notes: Scene3,
  podium: Scene4,
  tasks: Scene5,
  close: Scene6,
};

export default function VideoTemplate() {
  const { currentSceneKey } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const SceneComponent = SCENE_COMPONENTS[currentSceneKey];

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden" dir="rtl">
      <div className="relative w-full max-w-[177.78vh] aspect-video overflow-hidden bg-black">
        {/*
         * Plain key-based React swap — no AnimatePresence wrapper. Two
         * earlier attempts via AnimatePresence broke scene advancement:
         *   1. `mode="wait"` produced a 1.2s black flash at every cut
         *      because it fully unmounts the outgoing scene before
         *      mounting the incoming one (Task #35).
         *   2. Removing `mode="wait"` left both scenes mounted with
         *      animated z-index, which interacted badly with each
         *      scene's own internal AnimatePresence (Scene2's word
         *      ticker, Scene3's note picker) and froze playback on
         *      Scene 1 in production builds — exactly the symptom the
         *      user reported.
         * A plain `key` swap is bullet-proof: when `currentSceneKey`
         * changes, React unmounts the old scene and mounts the new one
         * in the same render. Each scene's own framer-motion entrance
         * animations still run because they live INSIDE the scene
         * component, not in this wrapper. Scenes use opaque backdrops
         * (var(--color-bg-cream)/dark/light) so the cut from one scene
         * to the next is a snappy hard cut, never exposing the wrapper
         * `bg-black` for more than one frame.
         */}
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </div>
    </div>
  );
}
