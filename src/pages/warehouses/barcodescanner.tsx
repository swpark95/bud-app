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
  onDetected: (
    barcodeText: string,
    resultPoints: { getX(): number; getY(): number }[]
  ) => void;
  onError: (error: Error) => void;
  /**
   * If true, after failing the back camera it will try the front camera.
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

    /** Zoom state (CSS scale) */
    const [zoomValue, setZoomValue] = useState<number>(1);
    const [zoomSupported, setZoomSupported] = useState<boolean>(false);
    const [zoomCaps, setZoomCaps] = useState<{
      min: number;
      max: number;
      step: number;
    }>({ min: 1, max: 1, step: 0.1 });

    /** Torch on/off state */
    const [torchOn, setTorchOn] = useState<boolean>(false);

    /** Debounce timer for hardware zoom */
    const zoomTimeoutRef = useRef<number | null>(null);

    // Expose stop() to parent
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
      // Prevent double-init under StrictMode
      if (initializedRef.current) return;
      initializedRef.current = true;

      if (!videoRef.current) {
        console.warn("[BarcodeScanner] videoRef not set.");
        return;
      }

      console.log("[BarcodeScanner] Initializing camera…");

      // 1) ZXing hints
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

      // 2) Zoom initialization once stream is live
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

          // Initially set hardware zoom to min
          ;(track as any)
            .applyConstraints({ advanced: [{ zoom: min }] })
            .catch(() => {
              /* ignore if it fails */
            });
        } else {
          setZoomSupported(false);
        }
      };

      // 3) Invoke ZXing reader with constraints
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

              // Stop scanner once detected
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

      // 4) Try back → front if allowed
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

      // 5) Cleanup on unmount
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

    /** Debounced setter for hardware zoom → applyConstraints */
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

    /** Called on slider change */
    const onZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.currentTarget.value);
      setZoomValue(newZoom);

      // Clear any pending timeout
      if (zoomTimeoutRef.current != null) {
        window.clearTimeout(zoomTimeoutRef.current);
      }
      // Debounce hardware zoom: only apply after 100ms of no further changes
      zoomTimeoutRef.current = window.setTimeout(() => {
        applyHardwareZoom(newZoom);
        zoomTimeoutRef.current = null;
      }, 100);
    };

    /** Toggle torch on/off */
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
          backgroundColor: "#000",
        }}
      >
        {/* Video feed. We apply CSS scale for smooth zoom feedback. */}
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoomValue})`,
            transition: "transform 0.15s ease-out",
          }}
          muted
          playsInline
        />

        {/* Torch toggle button (top-right) */}
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

        {/* Zoom slider, only if supported */}
        {zoomSupported && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "90%",            // Make slider span 90% of container
              padding: "0 12px",       // Add horizontal padding
              zIndex: 999,
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
                // Bump up the thumb hit area via pseudo‐styles:
                WebkitAppearance: "none",
                height: "8px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.3)",
                outline: "none",
              }}
            />
            {/* 
              Note: You can optionally add CSS for the ::-webkit-slider-thumb 
              to increase its size and clickable area. For brevity, I'm relying 
              on the extra padding around the input container. 
            */}
          </div>
        )}

        {/* Scan‐area overlays */}
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
