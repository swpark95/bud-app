// src/pages/warehouses/barcodescanner.tsx

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import {
  BrowserMultiFormatReader,
  IScannerControls,
} from "@zxing/browser";
import {
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";

export interface BarcodeScannerProps {
  /**
   * 바코드 텍스트가 감지되면 호출됩니다.
   * resultPoints 배열을 통해 스캔 위치 좌표를 받을 수 있습니다.
   */
  onDetected: (
    barcodeText: string,
    resultPoints: { getX(): number; getY(): number }[]
  ) => void;
  onError: (error: Error) => void;
  /**
   * 개발용: 전면 카메라도 시도하려면 true.
   * 배포 시 false로 두면 오직 후면 카메라만 사용합니다.
   */
  fallbackToFrontCameraForTest?: boolean;
}

export interface BarcodeScannerHandle {
  stop: () => void;
}

const BarcodeScanner = forwardRef<
  BarcodeScannerHandle,
  BarcodeScannerProps
>(
  (
    { onDetected, onError, fallbackToFrontCameraForTest = true },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(
      null
    );
    const controlsRef = useRef<IScannerControls | null>(null);
    const initializedRef = useRef<boolean>(false);

    /** 줌 상태 (CSS scale) */
    const [zoomValue, setZoomValue] = useState<number>(1);
    const [zoomSupported, setZoomSupported] = useState<boolean>(false);
    const [zoomCaps, setZoomCaps] = useState<{
      min: number;
      max: number;
      step: number;
    }>({ min: 1, max: 1, step: 0.1 });

    /** 토치 상태 */
    const [torchOn, setTorchOn] = useState<boolean>(false);

    /** 하드웨어 줌 디바운스 타이머 */
    const zoomTimeoutRef = useRef<number | null>(null);

    // 부모가 stop()을 호출할 수 있게끔 노출
    useImperativeHandle(ref, () => ({
      stop: () => {
        if (controlsRef.current) {
          try {
            controlsRef.current.stop();
            console.log(
              "[BarcodeScanner] External stop() → scanner stopped"
            );
          } catch (e: unknown) {
            console.warn(
              "[BarcodeScanner] External stop() error:",
              e
            );
          }
        }
        if (codeReaderRef.current) {
          try {
            (codeReaderRef.current as any).reset();
            console.log(
              "[BarcodeScanner] External reset() → scanner reset"
            );
          } catch {}
        }
      },
    }));

    useEffect(() => {
      // StrictMode나 리렌더링 방지: 한 번만 초기화
      if (initializedRef.current) return;
      initializedRef.current = true;

      if (!videoRef.current) {
        console.warn("[BarcodeScanner] videoRef not set.");
        return;
      }

      console.log("[BarcodeScanner] Initializing camera…");

      // 1) ZXing 디코딩 힌트 설정
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      // 2) 줌 초기화 (스트림이 시작된 후 호출)
      const initZoom = () => {
        const stream = videoRef.current!.srcObject as MediaStream | null;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;

        const caps = (track.getCapabilities() as any);
        if ("zoom" in caps) {
          const { min, max, step } = caps.zoom as {
            min: number;
            max: number;
            step: number;
          };
          setZoomSupported(true);
          setZoomCaps({ min, max, step });
          setZoomValue(min);

          // 초기 하드웨어 줌 값 설정
          ;(track as any)
            .applyConstraints({ advanced: [{ zoom: min }] })
            .catch(() => {
              /* 무시 */
            });
        } else {
          setZoomSupported(false);
        }
      };

      // 3) 카메라를 제약조건과 함께 시작
      const startScannerWithConstraints = (
        facingMode: "environment" | "user"
      ) => {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        console.log(
          `[BarcodeScanner] Trying camera: ${facingMode}`
        );

        return codeReader.decodeFromConstraints(
          constraints,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText().trim();
              const points = result.getResultPoints();
              console.log(
                `[BarcodeScanner] (${facingMode}) detected →`,
                text
              );
              onDetected(text, points);

              // 바코드 인식되면 자동 중지
              if (controlsRef.current) {
                try {
                  controlsRef.current.stop();
                  console.log(
                    `[BarcodeScanner] (${facingMode}) scanner stopped`
                  );
                } catch (e: unknown) {
                  console.warn(
                    `[BarcodeScanner] (${facingMode}) stop error:`,
                    e
                  );
                }
              }
            }
            if (err && err.name !== "NotFoundException") {
              console.error(
                `[BarcodeScanner] (${facingMode}) error:`,
                err
              );
              onError(err as Error);
            }
          }
        );
      };

      // 4) 후면→전면 순으로 카메라 시도
      if (fallbackToFrontCameraForTest) {
        startScannerWithConstraints("environment")
          .then((controls) => {
            controlsRef.current = controls;
            console.log(
              "[BarcodeScanner] Back camera succeeded"
            );
            initZoom();
          })
          .catch((rearErr) => {
            console.warn(
              "[BarcodeScanner] Back camera failed:",
              rearErr
            );
            return startScannerWithConstraints("user")
              .then((controls) => {
                controlsRef.current = controls;
                console.log(
                  "[BarcodeScanner] Front camera succeeded"
                );
                initZoom();
              })
              .catch((frontErr) => {
                console.error(
                  "[BarcodeScanner] Front camera failed:",
                  frontErr
                );
                onError(frontErr as Error);
              });
          });
      } else {
        startScannerWithConstraints("environment")
          .then((controls) => {
            controlsRef.current = controls;
            console.log(
              "[BarcodeScanner] Back camera succeeded"
            );
            initZoom();
          })
          .catch((rearErr) => {
            console.error(
              "[BarcodeScanner] Back camera failed:",
              rearErr
            );
            onError(rearErr as Error);
          });
      }

      // 5) 언마운트 시 정리
      return () => {
        console.log(
          "[BarcodeScanner] Unmounting → cleaning up"
        );
        if (controlsRef.current) {
          try {
            controlsRef.current.stop();
            console.log(
              "[BarcodeScanner] controls.stop() called on unmount"
            );
          } catch {}
        }
        if (codeReaderRef.current) {
          try {
            (codeReaderRef.current as any).reset();
            console.log(
              "[BarcodeScanner] codeReader.reset() called on unmount"
            );
          } catch {
            console.warn(
              "[BarcodeScanner] No reset() method; ignoring"
            );
          }
        }
      };
    }, [fallbackToFrontCameraForTest, onDetected, onError]);

    /** 디바운스 후 하드웨어 줌 적용 */
    const applyHardwareZoom = useCallback(
      (newZoom: number) => {
        if (!videoRef.current) return;
        const stream = videoRef.current.srcObject as
          | MediaStream
          | null;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;

        (track as any)
          .applyConstraints({ advanced: [{ zoom: newZoom }] })
          .catch((e: unknown) => {
            console.warn(
              "[BarcodeScanner] hardware zoom failed:",
              e
            );
          });
      },
      []
    );

    /** 슬라이더 변경 시 호출 */
    const onZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.currentTarget.value);
      setZoomValue(newZoom);

      // 디바운스: 100ms 후에 하드웨어 줌 적용
      if (zoomTimeoutRef.current != null) {
        window.clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = window.setTimeout(() => {
        applyHardwareZoom(newZoom);
        zoomTimeoutRef.current = null;
      }, 100);
    };

    /** 토치 토글 */
    const toggleTorch = () => {
      if (!videoRef.current) return;
      const stream = videoRef.current.srcObject as
        | MediaStream
        | null;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      const caps = (track.getCapabilities() as any);
      if (!caps.torch) {
        alert("Torch not supported on this camera.");
        return;
      }

      const newTorch = !torchOn;
      (track as any)
        .applyConstraints({
          advanced: [{ torch: newTorch }],
        })
        .then(() => {
          setTorchOn(newTorch);
          console.log(
            `[BarcodeScanner] torch ${
              newTorch ? "enabled" : "disabled"
            }`
          );
        })
        .catch((e: unknown) => {
          console.warn(
            "[BarcodeScanner] torch toggle failed:",
            e
          );
        });
    };

    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* 1) 절대 위치로 가운데 Cropping, CSS scale 적용 */}
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",

            /* 컨테이너 높이를 기준으로 최초 가득 채우고, 넘치는 가로 부분을 자름 */
            width: "auto",
            height: "100%",
            objectFit: "cover",

            /* 중앙 정렬 후 scale 적용 */
            transform: `translate(-50%, -50%) scale(${zoomValue})`,
            transition: "transform 0.15s ease-out",
          }}
          muted
          playsInline
        />

        {/* 2) 토치 토글 버튼 (우측 상단) */}
        <button
          onClick={toggleTorch}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            border: "none",
            borderRadius: "4px",
            padding: "8px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {torchOn ? "🔦 Off" : "🔦 On"}
        </button>

        {/* 3) 줌 슬라이더: 아래에서 좀 더 띄우고 위/아래 padding */}
        {zoomSupported && (
          <div
            style={{
              position: "absolute",
              bottom: "32px",      /* 바닥에서 충분히 띄움 */
              left: "50%",
              transform: "translateX(-50%)",
              width: "90%",
              zIndex: 999,

              padding: "8px 0",    /* 위/아래 마진을 줘서 노란 테두리와 간격 확보 */
            }}
          >
            <input
              type="range"
              min={zoomCaps.min}
              max={zoomCaps.max}
              step={zoomCaps.step}
              value={zoomValue}
              onChange={onZoomSliderChange}
              style={{
                width: "100%",
                WebkitAppearance: "none",
                height: "8px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.3)",
                outline: "none",

                /* 슬라이더 thumb 영역을 살짝 늘리고 싶다면 padding 추가 가능 */
                padding: "4px 0",
              }}
            />
          </div>
        )}

        {/* 4) 스캔 영역 오버레이 */}
        <div className="scan-overlay-top" />
        <div className="scan-overlay-bottom" />
        <div className="scan-overlay-left" />
        <div className="scan-overlay-right" />
        <div className="scan-border" />
      </div>
    );
  }
);

export default BarcodeScanner;
