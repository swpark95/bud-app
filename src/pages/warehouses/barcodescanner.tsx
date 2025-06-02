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
     * 개발용: 전면 카메라도 시도하려면 true.
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
              (codeReaderRef.current as any).reset();
              console.log("[BarcodeScanner] 외부 reset() 호출됨 → 스캐너 초기화");
            } catch {}
          }
        },
      }));
  
      useEffect(() => {
        // StrictMode에서 useEffect가 두 번 호출되지 않도록 한 번만 초기화
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
  
        // 카메라 스트림이 붙은 뒤 torch를 켜기 위한 함수
        const enableTorch = () => {
          const stream = videoRef.current!.srcObject as MediaStream | null;
          if (stream) {
            const track = stream.getVideoTracks()[0];
            if (track) {
              // 타입 체크를 우회하기 위해 any로 캐스트
              const constraints: any = { advanced: [{ torch: true }] };
              track
                .applyConstraints(constraints)
                .then(() => {
                  console.log("[BarcodeScanner] 토치(손전등) 활성화됨");
                })
                .catch((e: any) => {
                  console.warn("[BarcodeScanner] 토치 활성화 실패:", e);
                });
            } else {
              console.warn("[BarcodeScanner] 비디오 트랙을 찾을 수 없음");
            }
          }
        };
  
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
                console.log("[BarcodeScanner] (후면) 바코드 인식 →", text);
                onDetected(text, points);
  
                // 인식되면 자동 중지
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
  
        // 2) 전면 사용자 카메라 시도
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
                console.log("[BarcodeScanner] (전면) 바코드 인식 →", text);
                onDetected(text, points);
  
                // 인식되면 자동 중지
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
              enableTorch(); // 스트림이 붙은 뒤 토치 켜기
            })
            .catch((rearErr) => {
              console.warn("[BarcodeScanner] 후면 카메라 실패:", rearErr);
              tryUser()
                .then((controls: IScannerControls) => {
                  controlsRef.current = controls;
                  console.log(
                    "[BarcodeScanner] 전면 카메라 성공 → controls 저장"
                  );
                  enableTorch(); // 전면에서도 토치 켜기 시도
                })
                .catch((frontErr) => {
                  console.error("[BarcodeScanner] 전면 카메라 실패:", frontErr);
                  onError(frontErr as Error);
                });
            });
        } else {
          tryEnvironment()
            .then((controls: IScannerControls) => {
              controlsRef.current = controls;
              console.log("[BarcodeScanner] 후면 카메라 성공 → controls 저장");
              enableTorch();
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
  