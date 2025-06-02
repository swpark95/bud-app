// src/pages/warehouses/barcodescanner.tsx

import React, { useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export interface BarcodeScannerProps {
  /**
   * 바코드가 감지되면 호출됩니다.
   * 두 번째 인자로 getResultPoints() 배열을 넘겨주어,
   * 화면 상의 (x, y) 좌표를 체크할 수 있게 했습니다.
   */
  onDetected: (
    barcodeText: string,
    resultPoints: { getX(): number; getY(): number }[]
  ) => void;
  onError: (error: Error) => void;
  deviceId?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onError,
  deviceId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // ZXing 코드 리더 인스턴스 생성
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    BrowserMultiFormatReader
      .listVideoInputDevices()
      .then((videoInputDevices: MediaDeviceInfo[]) => {
        let chosenDeviceId = deviceId;
        if (!chosenDeviceId && videoInputDevices.length > 0) {
          chosenDeviceId = videoInputDevices[0].deviceId;
        }

        (async () => {
          try {
            // 카메라로부터 decodeFromVideoDevice 실행
            const controls = await codeReader.decodeFromVideoDevice(
              chosenDeviceId || undefined,
              videoRef.current!,
              (result, err) => {
                if (result) {
                  // 바코드가 감지되면 텍스트 + 포인트 좌표를 상위로 전달
                  const points = result.getResultPoints();
                  onDetected(result.getText(), points);
                }
                if (err && err.name !== "NotFoundException") {
                  onError(err as Error);
                }
              }
            );
            controlsRef.current = controls;
          } catch (e) {
            onError(e as Error);
          }
        })();
      })
      .catch((err: Error) => {
        onError(err);
      });

    return () => {
      // 언마운트 시 카메라·스캐너 정리
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
      if (codeReaderRef.current) {
        try {
          (codeReaderRef.current as any).reset();
        } catch {}
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

      {/* 2) 바깥 영역 어둡게 처리하는 4개의 OVERLAY */}
      {/*   중앙 노란 영역을 뚫어두고, 그 바깥만 검정 반투명 */}
      <div className="scan-overlay-top" />
      <div className="scan-overlay-bottom" />
      <div className="scan-overlay-left" />
      <div className="scan-overlay-right" />

      {/* 3) 중앙 노란색 테두리 */}
      <div className="scan-border" />
    </div>
  );
};

export default BarcodeScanner;
