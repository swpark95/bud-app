// src/pages/warehouses/barcodescanner.tsx

import React, {
    useRef,
    useEffect,
    useImperativeHandle,
    forwardRef,
  } from "react";
  import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
  
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
     * 테스트용으로 전면 카메라도 시도하려면 true.
     * 배포 시 false로 두면 오직 후면 카메라만 사용합니다.
     */
    fallbackToFrontCameraForTest?: boolean;
  }
  
  export interface BarcodeScannerHandle {
    stop: () => void;
  }
  
  const BarcodeScanner = forwardRef<BarcodeScannerHandle, BarcodeScannerProps>(
    ({ onDetected, onError, fallbackToFrontCameraForTest = true }, ref) => {
      const videoRef = useRef<HTMLVideoElement>(null);
      const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
      const controlsRef = useRef<IScannerControls | null>(null);
  
      // “한 번만 초기화”를 보장하기 위한 플래그 (StrictMode 대응)
      const initializedRef = useRef<boolean>(false);
  
      // 부모가 stop()을 호출할 수 있도록 노출
      useImperativeHandle(ref, () => ({
        stop: () => {
          if (controlsRef.current) {
            try {
              controlsRef.current.stop();
              console.log("[BarcodeScanner] 외부 stop() 호출됨 → 스캐너 중지");
            } catch (e) {
              console.warn("[BarcodeScanner] 외부 stop() 중 오류:", e);
            }
          }
          if (codeReaderRef.current) {
            try {
              // 예비적으로 reset()도 호출해본다
              (codeReaderRef.current as any).reset();
              console.log("[BarcodeScanner] 외부 reset() 호출됨 → 스캐너 초기화");
            } catch {
              // reset 메서드가 없으면 무시
            }
          }
        },
      }));
  
      useEffect(() => {
        // 이미 한 번 초기화했다면 두 번째 호출은 무시
        if (initializedRef.current) {
          return;
        }
        initializedRef.current = true;
  
        if (!videoRef.current) {
          console.warn("[BarcodeScanner] videoRef가 설정되지 않음.");
          return;
        }
  
        console.log("[BarcodeScanner] useEffect 시작 → 카메라 초기화 시도");
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;
  
        // 1) 후면(환경) 카메라 시도
        const tryEnvironment = () => {
          const constraints: MediaStreamConstraints = {
            video: { facingMode: "environment" },
          };
          console.log("[BarcodeScanner] 환경: facingMode='environment' 시도");
          return codeReader.decodeFromConstraints(
            constraints,
            videoRef.current!,
            (result, err) => {
              if (result) {
                const text = result.getText();
                const points = result.getResultPoints();
                console.log("[BarcodeScanner] (후면) 인식 성공 →", text);
  
                // 1) 콜백 전달
                onDetected(text, points);
  
                // 2) 즉시 스트림 중지
                if (controlsRef.current) {
                  try {
                    controlsRef.current.stop();
                    console.log(
                      "[BarcodeScanner] (후면) controls.stop() → 스캐너 중지"
                    );
                  } catch (e) {
                    console.warn("[BarcodeScanner] (후면) stop 중 오류:", e);
                  }
                }
              }
              if (err && err.name !== "NotFoundException") {
                console.error("[BarcodeScanner] (후면) 스캔 에러:", err);
                onError(err as Error);
              }
            }
          );
        };
  
        // 2) 전면 카메라 시도
        const tryUser = () => {
          const constraints: MediaStreamConstraints = {
            video: { facingMode: "user" },
          };
          console.log("[BarcodeScanner] 전면: facingMode='user' 시도");
          return codeReader.decodeFromConstraints(
            constraints,
            videoRef.current!,
            (result, err) => {
              if (result) {
                const text = result.getText();
                const points = result.getResultPoints();
                console.log("[BarcodeScanner] (전면) 인식 성공 →", text);
  
                // 1) 콜백 전달
                onDetected(text, points);
  
                // 2) 즉시 스트림 중지
                if (controlsRef.current) {
                  try {
                    controlsRef.current.stop();
                    console.log(
                      "[BarcodeScanner] (전면) controls.stop() → 스캐너 중지"
                    );
                  } catch (e) {
                    console.warn("[BarcodeScanner] (전면) stop 중 오류:", e);
                  }
                }
              }
              if (err && err.name !== "NotFoundException") {
                console.error("[BarcodeScanner] (전면) 스캔 에러:", err);
                onError(err as Error);
              }
            }
          );
        };
  
        // 3) 순차 시도 (후면 → 실패 시 전면)
        if (fallbackToFrontCameraForTest) {
          tryEnvironment()
            .then((controls: IScannerControls) => {
              controlsRef.current = controls;
              console.log("[BarcodeScanner] 후면 카메라 성공 → controls 저장");
            })
            .catch((rearErr) => {
              console.warn("[BarcodeScanner] 후면 카메라 실패:", rearErr);
              tryUser()
                .then((controls: IScannerControls) => {
                  controlsRef.current = controls;
                  console.log("[BarcodeScanner] 전면 카메라 성공 → controls 저장");
                })
                .catch((frontErr) => {
                  console.error("[BarcodeScanner] 전면 카메라 실패:", frontErr);
                  onError(frontErr as Error);
                });
            });
        } else {
          // 배포 시엔 fallbackToFrontCameraForTest=false로 두면 오직 후면만 시도
          tryEnvironment()
            .then((controls: IScannerControls) => {
              controlsRef.current = controls;
              console.log("[BarcodeScanner] 후면 카메라 성공 → controls 저장");
            })
            .catch((rearErr) => {
              console.error("[BarcodeScanner] 후면 카메라 실패:", rearErr);
              onError(rearErr as Error);
            });
        }
  
        return () => {
          console.log("[BarcodeScanner] 언마운트 → 스캐너 정리 시작");
          if (controlsRef.current) {
            try {
              controlsRef.current.stop();
              console.log("[BarcodeScanner] 언마운트 시 controls.stop() 호출됨");
            } catch {}
          }
          if (codeReaderRef.current) {
            try {
              (codeReaderRef.current as any).reset();
              console.log("[BarcodeScanner] 언마운트 시 codeReader.reset() 호출됨");
            } catch {
              console.warn("[BarcodeScanner] reset() 메서드 없음, 무시");
            }
          }
        };
      }, [fallbackToFrontCameraForTest, onDetected, onError]);
  
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
          {/* OVERLAY 및 노란 테두리 등은 기존 CSS 그대로 사용합니다 */}
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
  