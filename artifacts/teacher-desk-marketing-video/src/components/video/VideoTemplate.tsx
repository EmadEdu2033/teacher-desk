import { AnimatePresence } from 'framer-motion';
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
         * No `mode="wait"` here on purpose: `wait` makes Framer Motion fully
         * unmount the outgoing scene before mounting the incoming one, which
         * exposes the wrapper's bg-black for the duration of the outgoing
         * exit + the incoming fade-in (~1.2s of black at every cut). With
         * the default mode, exit and enter overlap, so the outgoing scene
         * fades over the incoming one and the user sees a clean crossfade
         * without any black flash. Each Scene*.tsx is `absolute inset-0`
         * with an opaque backdrop, so layering them is safe.
         *
         * `initial={false}` is kept so the very first scene on first page
         * load does NOT play its enter animation (it just appears) — the
         * loop boundary still triggers Scene1's enter animation because
         * Scene1 then mounts as a *new* AnimatePresence child.
         */}
        <AnimatePresence initial={false}>
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
