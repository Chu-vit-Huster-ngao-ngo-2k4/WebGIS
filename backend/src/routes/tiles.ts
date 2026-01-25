import { Router, Request, Response } from 'express';
// import * as path from 'path';
// import mapnik = require('mapnik');
// @ts-ignore
import SphericalMercator = require('@mapbox/sphericalmercator');

const router = Router();
// const mercator = new (SphericalMercator as any)({ size: 256 });

/*
if ((mapnik as any).register_default_input_plugins) {
  (mapnik as any).register_default_input_plugins();
}
*/

router.get('/raster/:z/:x/:y.png', async (req: Request, res: Response) => {
    res.status(503).send('Mapnik disabled');
    /*
    const { z, x, y } = req.params;
    const zoom = parseInt(z, 10);
    const col = parseInt(x, 10);
    const row = parseInt(y, 10);

    const bbox = mercator.bbox(col, row, zoom, false, '900913');

    const stylePath = path.join(__dirname, '../../styles/raster-style.xml');
    const m = new (mapnik as any).Map(256, 256);

    m.load(stylePath, (err: any, loadedMap: any) => {
      if (err) throw err;

      loadedMap.zoomToBox(bbox);

      const im = new (mapnik as any).Image(256, 256);
      loadedMap.render(im, (renderErr: any, rendered: any) => {
        if (renderErr) throw renderErr;
        res.type('png');
        res.send(rendered.encodeSync('png'));
      });
    */
});

router.get('/vector/:z/:x/:y.mvt', async (req: Request, res: Response) => {
    res.status(503).send('Mapnik disabled');
    /*
    const { z, x, y } = req.params;
    const zoom = parseInt(z, 10);
    const col = parseInt(x, 10);
    const row = parseInt(y, 10);

    const bbox = mercator.bbox(col, row, zoom, false, '900913');

    const stylePath = path.join(__dirname, '../../styles/vector-style.xml');
    const m = new (mapnik as any).Map(256, 256);

    m.load(stylePath, (err: any, loadedMap: any) => {
      if (err) throw err;

      loadedMap.zoomToBox(bbox);
      loadedMap.bufferSize = 128;

      const vtile = new (mapnik as any).VectorTile(zoom, col, row);
      const renderOpts = { buffer_size: 128 };
      loadedMap.render(vtile, renderOpts, (renderErr: any, rendered: any) => {
        if (renderErr) throw renderErr;
        const data = rendered.getData();
        if (process.env.DEBUG_TILES === '1') {
          try {
            const names = typeof (rendered as any).names === 'function' ? (rendered as any).names() : [];
            console.log(`MVT z=${zoom} x=${col} y=${row} bytes=${data?.length ?? 0} layers=${JSON.stringify(names)}`);
          } catch {}
        }
        res.type('application/x-protobuf');
        res.send(data);
      });
    });
  } catch (error: any) {
    console.error('Vector tile error:', error);
    res.status(500).json({ error: error.message });
  }
  */
});

export default router;
