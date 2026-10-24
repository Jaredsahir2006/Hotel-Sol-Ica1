const HotelLogo = ({ light = false }) => {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          light ? "bg-white/15" : "bg-hotel-gold"
        }`}
      >
        <i
          className={`bi bi-building text-2xl ${
            light ? "text-white" : "text-hotel-navy"
          }`}
        ></i>
      </div>

      <div>
        <h1
          className={`m-0 font-['Playfair_Display'] text-xl font-bold ${
            light ? "text-white" : "text-hotel-navy"
          }`}
        >
         <span>
             HOTEL SOL ICA
         </span>
        </h1>

        <p
          className={`m-0 text-xs tracking-[0.25em] ${
            light ? "text-white/70" : "text-gray-500"
          }`}
        >
         <span>
             HOSPITALIDAD & CONFORT
         </span>
        </p>
      </div>
    </div>
  );
};

export default HotelLogo;