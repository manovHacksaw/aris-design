import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const pinataFormData = new FormData();
    pinataFormData.append("file", file);
    pinataFormData.append("pinataMetadata", JSON.stringify({ name: file.name }));
    pinataFormData.append(
      "pinataOptions",
      JSON.stringify({ cidVersion: 0 }) // CIDv0 (Qm...) for backend compatibility
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Pinata upload error:", errorData);
      return NextResponse.json(
        { error: "Failed to upload to Pinata" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const ipfsHash = data.IpfsHash;
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    return NextResponse.json({ success: true, cid: ipfsHash, url });
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
