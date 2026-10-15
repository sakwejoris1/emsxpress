// Photos used on emsxpress.com (Unsplash). Swap any URL here to change an image everywhere.
const u = (id: string, w = 1600, q = 70) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`

export const images = {
  hero: u('photo-1578575437130-527eed3abbec', 2000, 72), // container ships and gantry cranes at a freight terminal
  finalMile: u('photo-1622291971462-54df74f26585', 2000, 68), // courier moving a loaded hand truck
  business: u('photo-1600880292203-757bb62b4baf', 1600, 68), // colleagues reviewing shipping volumes
  newCustomer: u('photo-1617909517054-64d4958be1c9', 1000, 68),
  account: u('photo-1600880292203-757bb62b4baf', 1000, 68),
  services: u('photo-1570710891163-6d3b5c47248b', 1000, 68),
}
