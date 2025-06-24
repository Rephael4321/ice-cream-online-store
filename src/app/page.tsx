import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col md:flex-row justify-center items-center gap-10 mt-20 px-4">
      <Link
        href="/ice-screams"
        className="text-center hover:scale-105 transition"
      >
        <div className="flex flex-col gap-4 items-center">
          <Image
            src="/ice-scream.png"
            width={180}
            height={240}
            alt="ice scream"
          />
          <h2 className="text-2xl md:text-3xl text-pink-700 font-semibold">
            גלידות
          </h2>
        </div>
      </Link>

      <Link
        href="/popsicles"
        className="text-center hover:scale-105 transition"
      >
        <div className="flex flex-col gap-4 items-center">
          <Image src="/popsicle.png" width={180} height={240} alt="popsicle" />
          <h2 className="text-2xl md:text-3xl text-blue-600 font-semibold">
            ארטיקים
          </h2>
        </div>
      </Link>
    </div>
  );
}
