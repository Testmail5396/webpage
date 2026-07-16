/* =========================================================
   Photography section — SEED / PLACEHOLDER DATA
   ---------------------------------------------------------
   This file is DEMO content only. It is clearly separated
   from production data:
     - LOCAL mode  : seeds are copied into localStorage on
                     first visit, then fully editable/replaceable
                     from Admin Mode (no code changes needed).
     - SUPABASE    : this file is ignored; rows come from the DB.

   Placeholder images use picsum.photos (real editorial photos,
   deterministic per seed) so the layout looks complete before
   any real photograph is uploaded. Replace any card from
   Admin Mode → nothing here needs to be touched again.
   ========================================================= */
(function () {
  var UNIT = 480; // reference pixel size of one grid unit for image requests

  // Build a responsive set of image URLs for one placeholder photo.
  function imgSet(seed, w, h, grayscale) {
    var ar = w / h;
    var base = 'https://picsum.photos/seed/' + encodeURIComponent(seed);
    var g = grayscale ? '?grayscale' : '';
    var dispW = Math.round(UNIT * Math.max(w, 1));
    var dispH = Math.round(dispW / ar);
    function url(px) {
      var pw = Math.round(px);
      var ph = Math.round(pw / ar);
      return base + '/' + pw + '/' + ph + g;
    }
    return {
      thumbnailUrl: url(dispW * 0.4),
      imageUrl: url(dispW),                 // optimized display image
      highResolutionUrl: url(Math.min(dispW * 2, 2000)),
      originalImageUrl: url(Math.min(dispW * 2.5, 2400)),
      originalWidth: dispW * 3,
      originalHeight: dispH * 3
    };
  }

  function photo(o) {
    var set = imgSet(o.seed, o.w, o.h, o.bw);
    return {
      id: o.id,
      imageUrl: set.imageUrl,
      originalImageUrl: set.originalImageUrl,
      thumbnailUrl: set.thumbnailUrl,
      highResolutionUrl: set.highResolutionUrl,
      title: o.title || '',
      caption: o.caption || '',
      altText: o.alt,
      category: o.category || '',
      originalWidth: set.originalWidth,
      originalHeight: set.originalHeight,
      gridWidth: o.w,
      gridHeight: o.h,
      // gridX / gridY are computed by the packer on first layout,
      // then persisted once the admin saves an arrangement.
      gridX: null,
      gridY: null,
      focalPointX: o.fx != null ? o.fx : 0.5,
      focalPointY: o.fy != null ? o.fy : 0.5,
      sortOrder: o.order,
      isPublished: o.published !== false,
      isSeed: true,
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z'
    };
  }

  window.PhotographySeed = {
    settings: {
      title: 'Visual Stories',
      description: 'A personal collection of light, texture, and the quiet in between.',
      // Profile / owner details (editable, persisted)
      ownerName: 'Vikash MJ',
      bio: '',
      profilePhotoUrl: '',
      contactEmail: '',
      socialLinks: [],          // [{ label, url }]
      copyrightText: '© Vikash MJ',
      categories: ['Landscape', 'Portrait', 'Street', 'Architecture', 'Travel', 'Nature'],
      defaultGridGap: 16,
      defaultBorderRadius: 16,
      updatedAt: '2026-07-14T00:00:00.000Z'
    },
    // Spans are on the 12-column grid (w × h in grid units).
    photos: [
      photo({ id: 'seed-01', seed: 'valley-dawn', w: 6, h: 4, order: 1,
        title: 'Valley, first light', category: 'Landscape',
        caption: 'Dawn breaking over the ridgeline.',
        alt: 'Mountain valley bathed in soft morning light with mist along the floor', fy: 0.4 }),
      photo({ id: 'seed-02', seed: 'window-portrait', w: 3, h: 4, order: 2,
        title: 'Window light', category: 'Portrait',
        alt: 'Portrait of a person lit by soft daylight from a nearby window', fy: 0.35 }),
      photo({ id: 'seed-03', seed: 'street-crossing', w: 3, h: 2, order: 3, bw: true,
        title: 'Crossing', category: 'Street',
        alt: 'Black and white street scene of a figure crossing a wide avenue' }),
      photo({ id: 'seed-04', seed: 'concrete-curve', w: 3, h: 2, order: 4,
        title: 'Curve', category: 'Architecture',
        alt: 'Sweeping concrete architectural curve against a pale sky' }),
      photo({ id: 'seed-05', seed: 'narrow-alley', w: 3, h: 3, order: 5,
        title: 'Alleyway', category: 'Travel',
        alt: 'Narrow travel alley with warm walls receding into shadow' }),
      photo({ id: 'seed-06', seed: 'coastal-cliffs', w: 6, h: 3, order: 6,
        title: 'Cliffs', category: 'Landscape',
        caption: 'Where the land gives way to the sea.',
        alt: 'Coastal cliffs meeting the ocean under an overcast sky', fy: 0.55 }),
      photo({ id: 'seed-07', seed: 'fern-detail', w: 3, h: 3, order: 7,
        title: 'Unfurling', category: 'Nature',
        alt: 'Close-up detail of a young fern frond unfurling' }),
      photo({ id: 'seed-08', seed: 'desert-road', w: 6, h: 3, order: 8,
        title: 'The long way', category: 'Travel',
        caption: 'An empty road through open desert.',
        alt: 'Cinematic wide view of an empty road cutting through desert terrain', fy: 0.5 }),
      photo({ id: 'seed-09', seed: 'man-profile', w: 3, h: 5, order: 9, bw: true,
        title: 'Profile', category: 'Portrait',
        alt: 'Black and white profile portrait of a man against a dark background', fy: 0.4 }),
      photo({ id: 'seed-10', seed: 'spiral-stair', w: 3, h: 3, order: 10,
        title: 'Descent', category: 'Architecture',
        alt: 'Looking down a spiral staircase forming a geometric pattern' }),
      photo({ id: 'seed-11', seed: 'misty-forest', w: 3, h: 3, order: 11,
        title: 'Fog', category: 'Nature',
        alt: 'Misty forest with tall trees fading into fog' }),
      photo({ id: 'seed-12', seed: 'rooftops', w: 6, h: 3, order: 12,
        title: 'Rooftops', category: 'Travel',
        alt: 'Cluster of old-town rooftops seen from above at golden hour', fy: 0.5 }),
      photo({ id: 'seed-13', seed: 'market-hands', w: 3, h: 3, order: 13, bw: true,
        title: 'Market', category: 'Street',
        alt: 'Black and white candid of hands at a busy market stall' }),
      photo({ id: 'seed-14', seed: 'tall-waterfall', w: 3, h: 5, order: 14,
        title: 'Fall', category: 'Nature',
        caption: 'A thin ribbon of water in deep forest.',
        alt: 'Tall narrow waterfall cascading through dense green forest', fy: 0.5 })
    ]
  };
})();
