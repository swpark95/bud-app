// src/pages/warehouses/barcodescanner.tsx

import React, { useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export interface BarcodeScannerProps {
  onDetected: (barcodeText: string) => void;
  onError: (error: Error) => void;
  deviceId?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onError,
  deviceId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    console.log("[BarcodeScanner] useEffect 시작: 카메라 초기화 시도");
    if (!videoRef.current) return;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    BrowserMultiFormatReader
      .listVideoInputDevices()
      .then((videoInputDevices: MediaDeviceInfo[]) => {
        console.log("[BarcodeScanner] 사용 가능한 비디오 입력 장치 목록:", videoInputDevices);
        let chosenDeviceId = deviceId;
        if (!chosenDeviceId && videoInputDevices.length > 0) {
          chosenDeviceId = videoInputDevices[0].deviceId;
        }
        console.log("[BarcodeScanner] 선택된 deviceId:", chosenDeviceId);

        (async () => {
          try {
            const controls = await codeReader.decodeFromVideoDevice(
              chosenDeviceId || undefined,
              videoRef.current!,
              (result, err) => {
                if (result) {
                  console.log("[BarcodeScanner] 바코드 결과 감지됨:", result.getText());
                  onDetected(result.getText());
                }
                if (err && err.name !== "NotFoundException") {
                  console.log("[BarcodeScanner] 스캔 에러 발생:", err);
                  onError(err as Error);
                }
              }
            );
            controlsRef.current = controls;
            console.log("[BarcodeScanner] decodeFromVideoDevice 실행 완료, controls 저장됨");
          } catch (err) {
            console.log("[BarcodeScanner] 초기화 중 에러 발생:", err);
            onError(err as Error);
          }
        })();
      })
      .catch((err: Error) => {
        console.log("[BarcodeScanner] 비디오 디바이스 목록 조회 에러:", err);
        onError(err);
      });

    return () => {
      console.log("[BarcodeScanner] 언마운트: 스캐너 정리");
      if (controlsRef.current) {
        controlsRef.current.stop();
        console.log("[BarcodeScanner] controls.stop() 호출");
      }
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset();
        } catch {
          console.log("[BarcodeScanner] reset 메서드 없음, 무시");
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
    </div>
  );
};

export default BarcodeScanner;
