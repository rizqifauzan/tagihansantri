import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Laporan Matrix V3",
    description: "Laporan matrix tagihan santri – full-page view",
};

export default function TagihanV3Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
