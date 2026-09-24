import { Link } from "react-router-dom";
import villageLogo from "@/assets/logo-bandung.png";

export default function VillageBrand() {
  return (
    <Link to="/" aria-label="Beranda Kelurahan KebonLega" className="flex shrink-0 items-center gap-2">
      <img src={villageLogo} alt="Lambang Kota Bandung" className="h-12 w-14 object-contain" />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-wider">Kelurahan</span>
        <span className="text-sm font-bold">KebonLega</span>
      </span>
    </Link>
  );
}
