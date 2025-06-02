// src/pages/warehouses/barcodescanner.tsx

import React, { useRef, useEffect } from "react";
import {
  BrowserMultiFormatReader,
  IScannerControls,
} from "@zxing/browser";

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
  deviceId?: string; // 선택적으로 디바이스 ID를 넘겨 후면/전면 카메라를 고정할 수 있습니다.
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onError,
  deviceId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    console.log("[BarcodeScanner] useEffect 시작 → 카메라 초기화 시도");
    if (!videoRef.current) {
      console.warn("[BarcodeScanner] videoRef가 아직 설정되지 않음.");
      return;
    }

    // ────── 1) ZXing Reader 인스턴스 생성 ──────
    console.log("[BarcodeScanner] 1) BrowserMultiFormatReader 생성");
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    // ────── 2) 스트림 제약조건 정의 ──────
    // 후면 카메라(facingMode: "environment") + 해상도 1280×720
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    // ────── 3) decodeFromConstraints 호출 ──────
    console.log(
      "[BarcodeScanner] 2) decodeFromConstraints 호출, constraints:",
      constraints
    );
    codeReader
      .decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result, err) => {
          // ─── 4) 콜백: 바코드 인식 또는 에러 발생 시 실행 ───
          if (result) {
            const text = result.getText();
            const points = result.getResultPoints();
            console.log("[BarcodeScanner] 3) 바코드 인식 성공 → 텍스트:", text);
            console.log(
              "[BarcodeScanner]    → getResultPoints:",
              points
            );
            onDetected(text, points);
          }
          if (err && err.name !== "NotFoundException") {
            console.error("[BarcodeScanner] 4) 스캔 에러 발생:", err);
            onError(err as Error);
          }
        }
      )
      .then((controls: IScannerControls) => {
        console.log(
          "[BarcodeScanner] 5) decodeFromConstraints 성공, controlsRef에 저장"
        );
        controlsRef.current = controls;
      })
      .catch((e: Error) => {
        console.error(
          "[BarcodeScanner] 6) decodeFromConstraints 초기화 중 에러:",
          e
        );
        onError(e);
      });

    // ─────────────────────────────────────────────────────────────────────────
    // * 만약 특정 deviceId를 강제로 사용하고 싶다면 아래 주석을 참고하세요:
    //
    // BrowserMultiFormatReader
    //   .listVideoInputDevices()
    //   .then((videoInputDevices: MediaDeviceInfo[]) => {
    //     let chosen = deviceId;
    //     if (!chosen && videoInputDevices.length > 0) {
    //       // 라벨에 “back” 혹은 “rear”가 포함된 장치를 찾아 후면 카메라로 설정할 수 있습니다.
    //       const rear = videoInputDevices.find(d =>
    //         /back|rear|environment|후면/i.test(d.label)
    //       );
    //       chosen = rear ? rear.deviceId : videoInputDevices[0].deviceId;
    //     }
    //     console.log("[BarcodeScanner] 선택된 deviceId:", chosen);
    //     return codeReader.decodeFromVideoDevice(
    //       chosen!,
    //       videoRef.current!,
    //       (result, err) => {
    //         if (result) {
    //           console.log(
    //             "[BarcodeScanner] (deviceId) 바코드 인식 →",
    //             result.getText()
    //           );
    //           onDetected(result.getText(), result.getResultPoints());
    //         }
    //         if (err && err.name !== "NotFoundException") {
    //           console.error(
    //             "[BarcodeScanner] (deviceId) 스캔 에러 →",
    //             err
    //           );
    //           onError(err as Error);
    //         }
    //       }
    //     );
    //   })
    //   .then((controls: IScannerControls) => {
    //     console.log(
    //       "[BarcodeScanner] (deviceId) decodeFromVideoDevice 성공"
    //     );
    //     controlsRef.current = controls;
    //   })
    //   .catch((err) => {
    //     console.error(
    //       "[BarcodeScanner] (deviceId) 초기화 에러 →",
    //       err
    //     );
    //     onError(err as Error);
    //   });
    // ─────────────────────────────────────────────────────────────────────────

    return () => {
      console.log("[BarcodeScanner] 언마운트 → 스캐너 정리 시작");
      // ─── 5) 컴포넌트 언마운트 시, controls.stop() 호출 ───
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
          console.log("[BarcodeScanner] controls.stop() 호출됨");
        } catch {}
      }
      // ─── 6) codeReader.reset() 호출 ───
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset();
          console.log("[BarcodeScanner] codeReader.reset() 호출됨");
        } catch {
          console.warn(
            "[BarcodeScanner] codeReader.reset() 메서드 없음, 무시"
          );
        }
      }
    };
  }, [deviceId, onDetected, onError]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* 1) 실제 카메라 영상 */}
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

      {/* 2) 바깥 영역을 검정 반투명으로 덮는 OVERLAY 4개 */}
      <div className="scan-overlay-top" />
      <div className="scan-overlay-bottom" />
      <div className="scan-overlay-left" />
      <div className="scan-overlay-right" />

      {/* 3) 중앙 노란 테두리 */}
      <div className="scan-border" />
    </div>
  );
};

export default BarcodeScanner;
