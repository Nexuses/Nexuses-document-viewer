async function uploadFile(file: File): Promise<string> {
  try {
    const presignedResponse = await fetch('/api/upload/s3-presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });

    if (presignedResponse.ok) {
      const { uploadUrl, fileUrl } = await presignedResponse.json();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (uploadResponse.ok) return fileUrl as string;
    }
  } catch {
    // fall through
  }

  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Upload failed');
  }
  const data = await response.json();
  return data.url as string;
}

export async function countPdfPages(file: File): Promise<number | undefined> {
  try {
    const { pdfjs } = await import('react-pdf');
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    return pdf.numPages;
  } catch {
    return undefined;
  }
}

export { uploadFile };
