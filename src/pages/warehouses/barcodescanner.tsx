// src/pages/warehouses/barcodescanner.tsx

import React, { useRef, useEffect, useState, useCallback } from "react";
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

  // 스캔 활성 여부: true일 때 스캐너가 동작 중, false일 때 스캔 중단 상태
  const [scanning, setScanning] = useState<boolean>(true);

  // 스캐너 시작 함수: scanning이 true로 바뀔 때마다 호출
  const startScanner = useCallback(() => {
    if (!videoRef.current) {
      console.warn("[BarcodeScanner] videoRef가 아직 설정되지 않음.");
      return;
    }

    console.log("[BarcodeScanner] startScanner 호출 → 스캔을 시작합니다.");

    // codeReader가 없으면 새로 생성
    const codeReader =
      codeReaderRef.current || new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    // 이미 실행 중인 controls가 있으면 정리
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
        console.log(
          "[BarcodeScanner] 기존 controlsRef가 존재하여 stop() 호출"
        );
      } catch {}
      controlsRef.current = null;
    }

    // ────── 스트림 제약조건 정의 ──────
    // 후면 카메라(facingMode: "environment") + 해상도 1280×720
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    // decodeFromConstraints로 후면 카메라 + 해상도 요청
    codeReader
      .decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const text = result.getText();
            const points = result.getResultPoints();
            console.log(
              "[BarcodeScanner] 바코드 인식 성공 → 텍스트:",
              text
            );
            console.log(
              "[BarcodeScanner]      → getResultPoints:",
              points
            );
            // 1) onDetected 콜백 실행
            onDetected(text, points);

            // 2) 스캔 중단
            if (controlsRef.current) {
              try {
                controlsRef.current.stop();
                console.log(
                  "[BarcodeScanner] 바코드 인식 후 controls.stop() 호출됨"
                );
              } catch {}
            }
            setScanning(false);
          }
          if (err && err.name !== "NotFoundException") {
            console.error("[BarcodeScanner] 스캔 에러 발생:", err);
            onError(err as Error);
          }
        }
      )
      .then((controls: IScannerControls) => {
        console.log(
          "[BarcodeScanner] decodeFromConstraints 성공 → controlsRef에 저장"
        );
        controlsRef.current = controls;
      })
      .catch((e: Error) => {
        console.error(
          "[BarcodeScanner] decodeFromConstraints 초기화 중 에러:",
          e
        );
        onError(e);
      });
  }, [onDetected, onError]);

  // 컴포넌트 마운트 시, 스캐너 자동 시작
  useEffect(() => {
    console.log(
      "[BarcodeScanner] useEffect 마운트 → startScanner 호출"
    );
    if (scanning) {
      startScanner();
    }
    // 언마운트 시 클린업
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
          console.warn(
            "[BarcodeScanner] codeReader.reset() 메서드 없음, 무시"
          );
        }
      }
    };
  }, [scanning, startScanner]);

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

      {/* 4) 스캔 완료 후, 재스캔 버튼 표시 */}
      {!scanning && (
        <button
          onClick={() => {
            console.log(
              "[BarcodeScanner] 재스캔 버튼 클릭 → scanning=true → startScanner 호출"
            );
            setScanning(true);
          }}
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 16px",
            fontSize: "16px",
            backgroundColor: "#377fd3",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          추가 스캔하기
        </button>
      )}
    </div>
  );
};

export default BarcodeScanner;
