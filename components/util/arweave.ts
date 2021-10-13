import Arweave from "arweave";


let _ARInstace;
export const getARInstance = () => {
  if (!_ARInstace) {
    _ARInstace = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    })
  }
  return _ARInstace;
}

export const uploadToArweave = async (transaction) => {
  if (!_ARInstace) {
    getARInstance();
  }
  const uploader = await _ARInstace.transactions.getUploader(transaction);
  while (!uploader.isComplete) {
    await uploader.uploadChunk();
    console.log(
      `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
    );
  }
};


export const generateArweaveWallet = async () => {
  if (!_ARInstace) {
    getARInstance();
  }
  const key = await _ARInstace.wallets.generate();
  localStorage.setItem("arweave-key", JSON.stringify(key));
  return key;
};

export const getKeyForJwk = (jwk) => {
  if (!_ARInstace) {
    getARInstance();
  }
  return _ARInstace.wallets.jwkToAddress(jwk)
};


export const fileToBuffer = (
  file: File
): Promise<{ buffer: ArrayBuffer; file: File }> => {
  return new Promise((resolve) => {
    var reader = new FileReader();

    reader.onload = function (readerEvt) {
      var buffer = readerEvt.target.result;

      resolve({
        buffer: buffer as ArrayBuffer,
        file,
      });
    };

    reader.readAsArrayBuffer(file);
  });
};
