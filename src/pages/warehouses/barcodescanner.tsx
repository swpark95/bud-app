// src/pages/warehouses/barcodescanner.tsx

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
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

    /** 슬라이더를 통한 줌 레벨 (카메라가 지원하지 않으면 숨김) */
    const [zoomSupported, setZoomSupported] = useState(false);
    const [zoomValue, setZoomValue] = useState(1);
    const [zoomMinMax, setZoomMinMax] = useState<{
      min: number;
      max: number;
      step: number;
    }>({ min: 1, max: 1, step: 0.1 });

    // 부모가 stop()을 호출할 수 있도록 노출
    useImperativeHandle(ref, () => ({
      stop: () => {
        if (controlsRef.current) {
          try {
            controlsRef.current.stop();
            console.log(
              "[BarcodeScanner] 외부 stop() 호출됨 → 스캐너 중지"
            );
          } catch (e: unknown) {
            console.warn(
              "[BarcodeScanner] 외부 stop() 중 오류:",
              e
            );
          }
        }
        if (codeReaderRef.current) {
          try {
            (codeReaderRef.current as any).reset();
            console.log(
              "[BarcodeScanner] 외부 reset() 호출됨 → 스캐너 초기화"
            );
          } catch {}
        }
      },
    }));

    useEffect(() => {
      // StrictMode나 리렌더링 방지: 한 번만 초기화
      if (initializedRef.current) {
        return;
      }
      initializedRef.current = true;

      if (!videoRef.current) {
        console.warn("[BarcodeScanner] videoRef가 설정되지 않음.");
        return;
      }

      console.log(
        "[BarcodeScanner] useEffect 시작 → 카메라 초기화 시도"
      );

      // ─── 1) ZXing 디코딩 힌트 설정 ───────────────────────────────────
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

      // ─── 2) 토치(손전등) 활성화 함수 ─────────────────────────────────
      const enableTorch = () => {
        if (!videoRef.current) return;
        const stream = videoRef.current.srcObject as
          | MediaStream
          | null;
        if (!stream) return;

        const track = stream.getVideoTracks()[0];
        if (!track) {
          console.warn("[BarcodeScanner] 비디오 트랙을 찾을 수 없음");
          return;
        }

        const capabilities = (track.getCapabilities() as any);
        if (capabilities.torch) {
          (track as any)
            .applyConstraints({
              advanced: [{ torch: true }],
            })
            .then(() => {
              console.log(
                "[BarcodeScanner] 토치(손전등) 활성화됨"
              );
            })
            .catch((e: unknown) => {
              console.warn(
                "[BarcodeScanner] 토치 활성화 실패:",
                e
              );
            });
        } else {
          console.log("[BarcodeScanner] 토치 미지원 카메라");
        }
      };

      // ─── 3) 줌(Zoom) 초기화 ─────────────────────────────────────────
      const initZoom = () => {
        if (!videoRef.current) return;
        const stream = videoRef.current.srcObject as
          | MediaStream
          | null;
        if (!stream) return;

        const track = stream.getVideoTracks()[0];
        if (!track) return;

        const caps = (track.getCapabilities() as any);
        if ("zoom" in caps) {
          const { min, max, step } = (caps.zoom as {
            min: number;
            max: number;
            step: number;
          });
          setZoomSupported(true);
          setZoomMinMax({ min, max, step });
          setZoomValue(min);

          ;(track as any)
            .applyConstraints({ advanced: [{ zoom: min }] })
            .catch(() => {
              /* 무시 */
            });
        } else {
          setZoomSupported(false);
        }
      };

      // ─── 4) 카메라 시도 순서 정의 ──────────────────────────────────────
      const startScannerWithConstraints = (
        facingMode: "environment" | "user"
      ) => {
        // 고해상도로 요청 (작은 바코드 인식 돕기)
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        console.log(
          `[BarcodeScanner] facingMode='${facingMode}' 시도 (1280x720)`
        );

        return codeReader.decodeFromConstraints(
          constraints,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText().trim();
              const points = result.getResultPoints();
              console.log(
                `[BarcodeScanner] (${facingMode}) 바코드 인식 →`,
                text
              );
              onDetected(text, points);

              // 인식되면 자동 중지
              if (controlsRef.current) {
                try {
                  controlsRef.current.stop();
                  console.log(
                    `[BarcodeScanner] (${facingMode}) controls.stop() → 스캐너 중지`
                  );
                } catch (e: unknown) {
                  console.warn(
                    `[BarcodeScanner] (${facingMode}) stop 중 오류:`,
                    e
                  );
                }
              }
            }
            if (err && err.name !== "NotFoundException") {
              console.error(
                `[BarcodeScanner] (${facingMode}) 스캔 에러:`,
                err
              );
              onError(err as Error);
            }
          }
        );
      };

      // ── 5) 실제로 “후면→전면” 순으로 시도 ─────────────────────────────
      if (fallbackToFrontCameraForTest) {
        startScannerWithConstraints("environment")
          .then((controls) => {
            controlsRef.current = controls;
            console.log(
              "[BarcodeScanner] 후면 카메라 성공 → controls 저장"
            );
            enableTorch();
            initZoom();
          })
          .catch((rearErr) => {
            console.warn(
              "[BarcodeScanner] 후면 카메라 실패:",
              rearErr
            );
            return startScannerWithConstraints("user")
              .then((controls) => {
                controlsRef.current = controls;
                console.log(
                  "[BarcodeScanner] 전면 카메라 성공 → controls 저장"
                );
                enableTorch();
                initZoom();
              })
              .catch((frontErr) => {
                console.error(
                  "[BarcodeScanner] 전면 카메라 실패:",
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
              "[BarcodeScanner] 후면 카메라 성공 → controls 저장"
            );
            enableTorch();
            initZoom();
          })
          .catch((rearErr) => {
            console.error(
              "[BarcodeScanner] 후면 카메라 실패:",
              rearErr
            );
            onError(rearErr as Error);
          });
      }

      // ─── 언마운트 시 정리 ──────────────────────────────────────────────
      return () => {
        console.log(
          "[BarcodeScanner] 언마운트 → 스캐너 정리 시작"
        );
        if (controlsRef.current) {
          try {
            controlsRef.current.stop();
            console.log(
              "[BarcodeScanner] 언마운트 시 controls.stop() 호출됨"
            );
          } catch {}
        }
        if (codeReaderRef.current) {
          try {
            (codeReaderRef.current as any).reset();
            console.log(
              "[BarcodeScanner] 언마운트 시 codeReader.reset() 호출됨"
            );
          } catch {
            console.warn(
              "[BarcodeScanner] reset() 메서드 없음, 무시"
            );
          }
        }
      };
    }, [fallbackToFrontCameraForTest, onDetected, onError]);

    /** 줌 슬라이더가 변경될 때 호출 */
    const onZoomChange = (newZoom: number) => {
      if (!videoRef.current) return;
      const stream = videoRef.current.srcObject as
        | MediaStream
        | null;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      ;(track as any)
        .applyConstraints({ advanced: [{ zoom: newZoom }] })
        .then(() => {
          setZoomValue(newZoom);
        })
        .catch((e: unknown) => {
          console.warn("[BarcodeScanner] 줌 설정 실패:", e);
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
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          muted
          playsInline
        />

        {/* ─── 줌 슬라이더 (지원되는 경우에만 렌더링) ──────────────────────── */}
        {zoomSupported && (
          <input
            type="range"
            min={zoomMinMax.min}
            max={zoomMinMax.max}
            step={zoomMinMax.step}
            value={zoomValue}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>
            ) =>
              onZoomChange(parseFloat(e.currentTarget.value))
            }
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "80%",
              zIndex: 999,
            }}
          />
        )}

        {/* ─── 스캔 영역 가이드 오버레이 ─────────────────────────────────── */}
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