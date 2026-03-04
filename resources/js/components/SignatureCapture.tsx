import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureCaptureProps {
    onSignatureChange: (signatureData: string) => void;
}

export default function SignatureCapture({ onSignatureChange }: SignatureCaptureProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [signatureMessage, setSignatureMessage] = useState<string>('');

    const clearSignature = () => {
        sigCanvas.current?.clear();
        setSignatureMessage('');
    };

    const saveSignature = () => {
        if (sigCanvas.current) {
            const dataUrl = sigCanvas.current.toDataURL();
            onSignatureChange(dataUrl);
            setSignatureMessage('Signature Captured ✅');
        }
    };

    return (
        <div className="mt-4">
            <label htmlFor="signature" className="mb-2 block text-sm font-medium text-gray-700">
                Enter Signature
            </label>
            <SignatureCanvas
                ref={sigCanvas}
                backgroundColor="white"
                penColor="black"
                canvasProps={{
                    width: 450,
                    height: 200,
                    className: 'signature-canvas border border-gray-300 rounded-md',
                }}
            />
            <div className="mt-5 flex justify-between">
                <button type="button" className="rounded-md bg-red-500 p-2 text-white" onClick={clearSignature}>
                    Clear
                </button>
                <button type="button" className="rounded-md bg-green-500 p-2 text-white" onClick={saveSignature}>
                    Save Signature
                </button>
            </div>
            {signatureMessage && <p className="mt-2 text-green-500">{signatureMessage}</p>}
        </div>
    );
}
