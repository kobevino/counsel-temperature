"use client";

import { useEffect, useRef } from "react";
// SVG 전용 경량 플레이어 — 전체 빌드와 달리 expression(eval)을 쓰지 않는다
import lottie from "lottie-web/build/player/lottie_light";
import type { AnimationItem } from "lottie-web";
import animationData from "./thermometer-loading.json";

/** 채움 상태가 가장 높은 프레임 — 정지 시 아이콘처럼 보여준다 */
const FILLED_FRAME = 75;

/** 온도계 채움/비움 루프 Lottie. playing=false면 채워진 상태로 정지한다 */
export function ThermometerLottie({
  className,
  playing = true,
}: {
  className?: string;
  playing?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const animation = useRef<AnimationItem | null>(null);

  useEffect(() => {
    animation.current = lottie.loadAnimation({
      container: container.current!,
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData,
    });
    return () => animation.current?.destroy();
  }, []);

  useEffect(() => {
    if (playing) animation.current?.goToAndPlay(0, true);
    else animation.current?.goToAndStop(FILLED_FRAME, true);
  }, [playing]);

  return <div ref={container} className={className} />;
}

/** 온도 분석이 도는 동안 패널을 dim 처리하고 위에 뜨는 로딩 오버레이 */
export default function ThermometerLoading() {
  return (
    <div
      role="status"
      aria-label="대화 온도 분석 중"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-ink/45 backdrop-blur-[2px]"
    >
      <ThermometerLottie className="h-44 w-44" />
      <p className="text-[13px] font-semibold text-white">
        대화 온도를 분석하고 있습니다
      </p>
    </div>
  );
}
