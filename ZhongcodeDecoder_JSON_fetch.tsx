import {
  useEffect,
  useRef,
  useState,
} from "react";

type Part =
  | string
  | {
      word: string;
      key: string;
    };

type TranscriptLine = {
  time: string;
  zh?: string;
  parts?: Part[];
  py: string;
  vi: string;
};

type Explanation = {
  word: string;
  pinyin: string;
  meaning: string;
  context: string;
  usage: string;
  example: string;
  examplePy: string;
  exampleVi: string;
  sentence?: string;
  sentencePy?: string;
  sentenceVi?: string;
};

function timeToSeconds(time: string) {
  const [minutes, seconds] = time.split(":").map(Number);
  return minutes * 60 + seconds;
}

/*
 * ============================================================
 * TRANSCRIPT
 * ============================================================
 *
 * Giữ nguyên transcript cũ đến 02:02, sau đó bổ sung các mốc
 * transcript đã có trong các ảnh/tài liệu của project.
 */

type VideoData = {
  title?: string;
  subtitleData?: TranscriptLine[];
  explanationData?: Record<string, Explanation>;
};

const DATA_BASE_URL = "PASTE_YOUR_PUBLIC_JSON_BASE_URL_HERE";
// Expected URL: DATA_BASE_URL + "/" + video slug + ".json"

export default function ZhongcodeDecoder() {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);

  const slug = typeof window !== "undefined"
    ? (window.location.pathname.split("/").filter(Boolean).pop() || "ga-tinh-va-duong-tang")
    : "ga-tinh-va-duong-tang";

  useEffect(() => {
    let cancelled = false;
    async function loadVideoData() {
      setDataLoading(true);
      setDataError("");
      try {
        if (DATA_BASE_URL.includes("PASTE_YOUR_PUBLIC_JSON_BASE_URL_HERE")) {
          throw new Error("Chưa cấu hình URL kho JSON trong code.");
        }
        const response = await fetch(`${DATA_BASE_URL.replace(/\\/$/, "")}/${encodeURIComponent(slug)}.json`);
        if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status}).`);
        const data = await response.json() as VideoData;
        if (!Array.isArray(data.subtitleData) || !data.explanationData || typeof data.explanationData !== "object") {
          throw new Error("File JSON thiếu subtitleData hoặc explanationData.");
        }
        if (!cancelled) setVideoData(data);
      } catch (error) {
        if (!cancelled) setDataError(error instanceof Error ? error.message : "Lỗi tải dữ liệu.");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadVideoData();
    return () => { cancelled = true; };
  }, [slug]);

  const transcript = videoData?.subtitleData ?? [];
  const explanations = videoData?.explanationData ?? {};
  const [activeLine, setActiveLine] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isFollowingRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const resumeFollowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const explanation = selected ? explanations[selected] : null;

  /*
   * ============================================================
   * VIDEO -> ACTIVE LINE
   * ============================================================
   *
   * Figma's inserted Video layer is a real HTML <video> element
   * on the published site, but it cannot be selected through the
   * code-layer "Pick..." property. So we connect to the rendered
   * video directly from the page DOM instead.
   *
   * This keeps the existing Figma video layer and its controls.
   */
  useEffect(() => {
    let video: HTMLVideoElement | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;

    const updateActiveLine = () => {
      if (!video) return;

      const currentTime = video.currentTime;
      let nextIndex = 0;

      for (let i = 0; i < transcript.length; i++) {
        const lineTime = timeToSeconds(transcript[i].time);

        if (lineTime <= currentTime) {
          nextIndex = i;
        } else {
          break;
        }
      }

      setActiveLine((prev) =>
        prev === nextIndex ? prev : nextIndex
      );
    };

    const connectToVideo = () => {
      const videos = Array.from(
        document.querySelectorAll("video")
      ) as HTMLVideoElement[];

      if (!videos.length) return false;

      // Prefer a visible video. This avoids accidentally attaching
      // to an unrelated hidden video if the page contains more than one.
      video =
        videos.find((item) => {
          const rect = item.getBoundingClientRect();
          const style = window.getComputedStyle(item);
          return (
            rect.width >
      {showWelcome && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-[520px] rounded-2xl bg-white px-7 py-6 shadow-2xl">
            <div className="mb-4 text-[18px] font-bold text-gray-900">📢 Thông báo nhỏ</div>
            <div className="space-y-3 text-[14px] leading-6 text-gray-700">
              <p><strong>Chào bạn!</strong></p>
              <p>Chúng mình là <strong>ZhongCode</strong>. Vì website vẫn đang trong giai đoạn hoàn thiện, nên mong bạn thông cảm nếu trải nghiệm chưa được mượt mà nhé!</p>
              <p>Những chỗ chúng mình <strong>đánh dấu</strong> là những nơi hiện tại bạn có thể click vào để trải nghiệm. Các phần còn lại hiện chỉ là <strong>mô phỏng</strong>.</p>
              <p>Chúng mình chân thành cảm ơn bạn đã đến và trải nghiệm <strong>ZhongCode</strong>. 💙</p>
              <p>Chúc bạn luôn gặp may mắn và ngày càng tiến bộ trong học tập! 🌱</p>
            </div>
            <button type="button" onClick={() => setShowWelcome(false)} className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition hover:opacity-85">Đã hiểu, bắt đầu khám phá →</button>
          </div>
        </div>
      )}
 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        }) ?? videos[0];

      video.addEventListener("timeupdate", updateActiveLine);
      video.addEventListener("seeked", updateActiveLine);
      video.addEventListener("loadedmetadata", updateActiveLine);

      updateActiveLine();
      return true;
    };

    // The Figma video can be mounted after the code layer.
    if (!connectToVideo()) {
      retryTimer = setInterval(() => {
        if (connectToVideo() && retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 250);
    }

    return () => {
      if (retryTimer) {
        clearInterval(retryTimer);
      }

      if (video) {
        video.removeEventListener("timeupdate", updateActiveLine);
        video.removeEventListener("seeked", updateActiveLine);
        video.removeEventListener("loadedmetadata", updateActiveLine);
      }
    };
  }, []);

  /*
   * ============================================================
   * AUTO FOLLOW HIGHLIGHT
   * ============================================================
   *
   * Keep the active transcript line inside the scroll box.
   * We calculate scrollTop directly instead of relying on
   * scrollIntoView, because the code layer may be nested inside
   * Figma's own scrolling/transform containers.
   */
  useEffect(() => {
    const container = transcriptRef.current;
    const activeElement = lineRefs.current[activeLine];

    if (!container || !activeElement || !isFollowingRef.current) {
      return;
    }

    const runAutoFollow = () => {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();

      const isVisible =
        activeRect.top >= containerRect.top + 12 &&
        activeRect.bottom <= containerRect.bottom - 12;

      if (isVisible) return;

      const currentScrollTop = container.scrollTop;

      const targetTop =
        currentScrollTop +
        (activeRect.top - containerRect.top) -
        container.clientHeight / 2 +
        activeElement.offsetHeight / 2;

      programmaticScrollRef.current = true;

      // Directly setting scrollTop is more reliable inside Figma Sites.
      container.scrollTop = Math.max(
        0,
        Math.min(
          targetTop,
          container.scrollHeight - container.clientHeight
        )
      );

      // Release the guard after the browser has processed the scroll event.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          programmaticScrollRef.current = false;
        });
      });
    };

    // Wait one frame so the newly highlighted line has its final layout.
    const frame = window.requestAnimationFrame(runAutoFollow);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeLine]);

  /*
   * ============================================================
   * MANUAL SCROLL
   * ============================================================
   */
  useEffect(() => {
    const container = transcriptRef.current;

    if (!container) return;

    const handleScroll = () => {
      if (programmaticScrollRef.current) return;

      isFollowingRef.current = false;

      if (resumeFollowTimerRef.current) {
        clearTimeout(resumeFollowTimerRef.current);
      }

      resumeFollowTimerRef.current = setTimeout(() => {
        const activeElement = lineRefs.current[activeLine];

        if (!activeElement) return;

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const tolerance = container.clientHeight * 0.2;

        const isNearHighlight =
          activeRect.bottom >= containerRect.top - tolerance &&
          activeRect.top <= containerRect.bottom + tolerance;

        if (isNearHighlight) {
          isFollowingRef.current = true;
        }
      }, 700);
    };

    container.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);

      if (resumeFollowTimerRef.current) {
        clearTimeout(resumeFollowTimerRef.current);
      }
    };
  }, [activeLine]);

  return (
    <div className="w-full h-full flex bg-white overflow-hidden">
      {(dataLoading || dataError) && (
        <div className="absolute inset-x-3 top-3 z-[10000] rounded-lg border border-blue-200 bg-white p-3 text-sm text-gray-700 shadow">
          {dataLoading ? "Đang tải dữ liệu ZhongCode…" : `Không tải được dữ liệu: ${dataError}`}
        </div>
      )}
      {/* ======================================================
          TRANSCRIPT
          ====================================================== */}
      <div
        ref={transcriptRef}
        className="w-[55%] h-full overflow-y-auto px-5 py-5"
      >
        <div className="space-y-1">
          {transcript.map((line, index) => {
            const isActive = activeLine === index;

            return (
              <div
                key={`${line.time}-${index}`}
                ref={(element) => {
                  lineRefs.current[index] = element;
                }}
                className={`
                  relative rounded-2xl px-3 py-2
                  transition-all duration-300
                  ${isActive ? "bg-[#eaf6fc]" : "bg-transparent"}
                `}
              >
                {/* TIMESTAMP */}
                <div className="text-[13px] text-gray-500 mb-0.5">
                  {line.time}
                </div>

                {/* CHINESE */}
                <div className="text-[19px] leading-relaxed">
                  {line.parts ? (
                    line.parts.map((part, i) => {
                      if (typeof part === "string") {
                        return <span key={i}>{part}</span>;
                      }

                      return (
                        <button
                          key={i}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(part.key);
                          }}
                          className="
                            text-red-500
                            font-semibold
                            hover:underline
                            cursor-pointer
                          "
                        >
                          {part.word}
                        </button>
                      );
                    })
                  ) : (
                    line.zh
                  )}
                </div>

                {/* PINYIN */}
                <div className="text-[12px] text-gray-600 leading-relaxed">
                  {line.py}
                </div>

                {/* VIETNAMESE */}
                <div className="text-[13px] text-[#1683c4] leading-relaxed">
                  {line.vi}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================
          GIẢI MÃ
          ====================================================== */}
      <div
        className="
          w-[45%]
          h-full
          bg-[#eef8fc]
          border-l
          border-gray-200
          overflow-y-auto
          px-7
          py-7
        "
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-7">
          Phần giải mã
        </h2>

        {!explanation && (
          <div className="h-[70%] flex items-center justify-center text-center">
            <p className="text-gray-500 text-lg leading-relaxed max-w-sm">
              Chọn những nội dung được bôi đỏ để xem phần giải mã nhé!
            </p>
          </div>
        )}

        {explanation && (
          <div className="space-y-7">
            {/* CẢ CÂU */}
            <section>
              <h3 className="font-bold mb-3">
                Cả câu chứa từ cần chú ý
              </h3>

              <p className="text-lg font-medium leading-relaxed">
                {explanation.sentence ?? explanation.word}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                {explanation.sentencePy ?? explanation.pinyin}
              </p>

              {explanation.sentenceVi && (
                <p className="text-sm text-[#1683c4] mt-1">
                  {explanation.sentenceVi}
                </p>
              )}
            </section>

            {/* TỪ */}
            <section>
              <h3 className="font-bold mb-2">
                Từ cần chú ý
              </h3>

              <div className="text-2xl font-bold text-red-500">
                {explanation.word}
              </div>

              <div className="text-sm text-gray-500 mt-1">
                {explanation.pinyin}
              </div>
            </section>

            {/* NGHĨA */}
            <section>
              <h3 className="font-bold mb-2">
                Nghĩa cơ bản
              </h3>

              <p className="text-sm leading-relaxed">
                {explanation.meaning}
              </p>
            </section>

            {/* NGỮ CẢNH */}
            <section>
              <h3 className="font-bold mb-2">
                Ngữ cảnh
              </h3>

              <p className="text-sm leading-relaxed">
                {explanation.context}
              </p>
            </section>

            {/* CÁCH DÙNG */}
            <section>
              <h3 className="font-bold mb-2">
                Cách dùng
              </h3>

              <p className="text-sm leading-relaxed">
                {explanation.usage}
              </p>
            </section>

            {/* VÍ DỤ */}
            <section>
              <h3 className="font-bold mb-2">
                Ví dụ thực tế
              </h3>

              <p className="text-lg font-medium">
                {explanation.example}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                {explanation.examplePy}
              </p>

              <p className="text-sm text-gray-600 mt-1">
                {explanation.exampleVi}
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
