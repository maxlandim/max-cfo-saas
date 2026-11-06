const STUBS = {
  'firebase-admin/app': './stubs/firebase-admin-app.mjs',
  'firebase-admin/firestore': './stubs/firebase-admin-firestore.mjs',
  'firebase-admin/auth': './stubs/firebase-admin-auth.mjs',
  'next/server': './stubs/next-server.mjs',
};

export async function resolve(especificador, contexto, proximo) {
  if (STUBS[especificador]) return { url: new URL(STUBS[especificador], import.meta.url).href, shortCircuit: true };
  try {
    return await proximo(especificador, contexto);
  } catch (e) {
    if (/^\.\.?\//.test(especificador) && !/\.[cm]?js$/.test(especificador)) return proximo(especificador + '.js', contexto);
    throw e;
  }
}
