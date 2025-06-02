// src/pages/warehouses/barcodescanner.tsx

import React, { useRef, useEffect } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export interface BarcodeScannerProps {
  /**
   * 바코드 텍스트가 감지되면 호출됩니다.
   * 두 번째 인자로 getResultPoints() 배열을 넘겨주어,
   * 화면 상의 (x, y) 좌표를 확인할 수 있게 합니다.
   */
  onDetected: (
    barcodeText: string,
    resultPoints: { getX(): number; getY(): number }[]
  ) => void;
  onError: (error: Error) => void;
  /**
   * 배포 전에는 이 부분을 삭제하세요.
   * 로컬 테스트 시, 후면 카메라가 안 떠서 앞면 카메라로도 시도하도록
   * 여기에 아무 값이나 전달하지 않아도 됩니다.
   */
  fallbackToFrontCameraForTest?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onError,
  fallbackToFrontCameraForTest = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      console.warn("[BarcodeScanner] videoRef가 설정되지 않음.");
      return;
    }

    console.log("[BarcodeScanner] useEffect 시작 → 카메라 초기화 시도");
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    // 후면 카메라 시도
    const tryEnvironment = () => {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { exact: "environment" } },
      };
      console.log("[BarcodeScanner] 환경: 후면 카메라 시도");
      return codeReader.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const text = result.getText();
            const points = result.getResultPoints();
            console.log("[BarcodeScanner] 바코드 인식 성공 → 텍스트:", text);
            onDetected(text, points);
          }
          if (err && err.name !== "NotFoundException") {
            console.error("[BarcodeScanner] 스캔 에러 발생:", err);
            onError(err as Error);
          }
        }
      );
    };

    // 전면 카메라 시도
    const tryUser = () => {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { exact: "user" } },
      };
      console.log("[BarcodeScanner] 후면 실패 → 앞면 카메라 시도");
      return codeReader.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const text = result.getText();
            const points = result.getResultPoints();
            console.log(
              "[BarcodeScanner] (앞면) 바코드 인식 성공 → 텍스트:",
              text
            );
            onDetected(text, points);
          }
          if (err && err.name !== "NotFoundException") {
            console.error("[BarcodeScanner] (앞면) 스캔 에러 발생:", err);
            onError(err as Error);
          }
        }
      );
    };

    // 후면 → 전면 순으로 시도
    tryEnvironment()
      .then((controls: IScannerControls) => {
        console.log("[BarcodeScanner] 후면 카메라 성공 → controlsRef에 저장");
        controlsRef.current = controls;

        // 손전등(토치) 켜기 시도
        const stream = videoRef.current!.srcObject as MediaStream | null;
        if (stream) {
          const track = stream.getVideoTracks()[0];
          if (track && "applyConstraints" in track) {
            // torch 제약은 TS 정의에 없으므로 any로 캐스트
            (track as any)
              .applyConstraints({ advanced: [{ torch: true }] })
              .catch(() => {
                console.warn("[BarcodeScanner] 토치 활성화 실패");
              });
          }
        }
      })
      .catch((e) => {
        console.warn("[BarcodeScanner] 후면 카메라 초기화 실패:", e);
        if (fallbackToFrontCameraForTest) {
          tryUser()
            .then((controls: IScannerControls) => {
              console.log(
                "[BarcodeScanner] 앞면 카메라 성공 → controlsRef에 저장"
              );
              controlsRef.current = controls;
              // 전면 카메라에서는 토치가 지원되지 않을 수 있음
            })
            .catch((err2) => {
              console.error(
                "[BarcodeScanner] 앞면 카메라 초기화 중 에러:",
                err2
              );
              onError(err2 as Error);
            });
        } else {
          onError(e as Error);
        }
      });

    return () => {
      console.log("[BarcodeScanner] 언마운트 → 스캐너 정리 시작");
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
          console.log("[BarcodeScanner] controls.stop() 호출됨");
        } catch {}
      }
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset();
          console.log("[BarcodeScanner] codeReader.reset() 호출됨");
        } catch {
          console.warn("[BarcodeScanner] codeReader.reset() 메서드 없음, 무시");
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

      {/* OVERLAY 및 테두리는 기존과 동일합니다 */}
      <div className="scan-overlay-top" />
      <div className="scan-overlay-bottom" />
      <div className="scan-overlay-left" />
      <div className="scan-overlay-right" />
      <div className="scan-border" />
    </div>
  );
};

export default BarcodeScanner;
