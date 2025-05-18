// Add this CSS to your stylesheet or within a <style> tag
const style = document.createElement('style');
style.textContent = `
  .flex-wrapper { display: flex; align-items: flex-start; gap: 20px; margin: 20px 0; }
  .composite {
    position: relative;
    width: 400px;
    height: 400px;
    overflow: hidden;
    transform-style: preserve-3d;
	transition: transform 0.1s ease;
    will-change: transform;
  }
  .layers-scroll { height: 400px; overflow-y: auto; flex: 1; }
  .layers-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 5px; padding: 0 10px 0 0; }
  .layer-row { display: flex; flex-direction: column; padding: 8px; border: 1px solid #eee; border-radius: 6px; }
  .layer-row .controls { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .layer-row label { font-size: 0.9rem; margin-bottom: 4px; }
  .layer-row select, .layer-row input[type=radio] { cursor: pointer; }
  .sliders-panel { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-top: 20px; }
  .sliders-panel div { display: flex; flex-direction: column; }
  .sliders-panel label { font-size: 0.85rem; margin-bottom: 4px; }
  .sliders-panel input[type=range] { width: 100%; }
`;
document.head.append(style);

const jsonUrl = '../physical_products/physical_products.json'; // adjust if needed
const MAX_TILT = 50; // maximum rotation in degrees

async function renderStickerLayers(divId, targetId) {
  const container = document.getElementById(divId);
  if (!container) {
    console.error(`Div with id '${divId}' not found`);
    return;
  }
  container.innerHTML = '';

  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error(`Failed to load JSON: ${response.statusText}`);
    const data = await response.json();

    const entry = data.find(item => item.id === targetId);
    if (!entry) return container.textContent = `Entry with id ${targetId} not found`;

    const hasStickerLayers = Array.isArray(entry.tags) && entry.tags.includes('custom_sticker');
    if (!hasStickerLayers) return renderFallback(entry, container);

    const layers = Object.keys(entry)
      .filter(key => key.startsWith('layer_') && Array.isArray(entry[key]))
      .map(name => ({ name, options: entry[name] }))
      .sort((a, b) => +a.name.replace('layer_', '') - +b.name.replace('layer_', ''));

    const blendModes = [ 'normal','multiply','overlay','screen','darken','lighten',
                         'color-dodge','color-burn','difference','exclusion' ];

    const flexWrapper = document.createElement('div');
    flexWrapper.classList.add('flex-wrapper');

    const compositeDiv = document.createElement('div');
    compositeDiv.classList.add('composite');

    // Tilt effect handlers
    compositeDiv.addEventListener('mousemove', e => {
      const rect = compositeDiv.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      const rotateY = (-x / (rect.width / 2)) * MAX_TILT;
      const rotateX = ( y / (rect.height / 2)) * MAX_TILT;
      compositeDiv.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    compositeDiv.addEventListener('mouseleave', () => {
      compositeDiv.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
    });

    const layersScroll = document.createElement('div');
    layersScroll.classList.add('layers-scroll');

    const layersDiv = document.createElement('div');
    layersDiv.classList.add('layers-list');
    layersScroll.appendChild(layersDiv);

    const layerImgs = [];
    const currentFilters = [];
    let selectedLayerIndex = null;

    // Build layers and controls
    layers.forEach((layer, i) => {
      const img = document.createElement('img');
      Object.assign(img.style, {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  transform: 'translate(-50%, -50%)', // scales image by 20%
  transformOrigin: 'center',
  pointerEvents: 'none',
  display: 'none'
});
      compositeDiv.appendChild(img);
      layerImgs.push(img);
      currentFilters[i] = { hue:0, saturation:1, brightness:1, contrast:1, alpha:1 };

      const row = document.createElement('div');
      row.classList.add('layer-row');

      const title = document.createElement('label');
      title.textContent = layer.options[1] || layer.name;
      row.append(title);

      const controls = document.createElement('div');
      controls.classList.add('controls');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'layerSelect';
      radio.title = `Edit ${layer.name}`;
      radio.addEventListener('change', () => {
        selectedLayerIndex = i;
        loadSliders(i);
      });
      controls.append(radio);

      if (i === 0) {
        radio.checked = true;
        selectedLayerIndex = 0;
      }

      const select = document.createElement('select');
      select.append(new Option('None', ''));
      const imgsList = [];
      for (let j = 2; j < layer.options.length; j += 2) {
        imgsList.push({ path: layer.options[j], label: layer.options[j+1] || layer.options[j] });
      }
      imgsList.forEach(o => select.append(new Option(o.label, o.path)));
      if (imgsList.length > 0) {
        img.src = imgsList[0].path;
        img.style.display = 'block';
        select.selectedIndex = 1;
      }
      select.addEventListener('change', e => {
        if (e.target.value) {
          img.src = e.target.value;
          img.style.display = 'block';
        } else {
          img.style.display = 'none';
        }
      });
      controls.append(select);

      const blendSelect = document.createElement('select');
      blendModes.forEach(m => blendSelect.append(new Option(m, m)));
      blendSelect.value = blendModes.includes(layer.options[0]) ? layer.options[0] : 'normal';
      blendSelect.addEventListener('change', e => {
        img.style.mixBlendMode = e.target.value;
      });
      controls.append(blendSelect);

      row.append(controls);
      layersDiv.appendChild(row);
    });

    // Build sliders panel
    const slidersPanel = document.createElement('div');
    slidersPanel.classList.add('sliders-panel');

    const labels = ['Hue','Saturation','Brightness','Contrast','Alpha'];
    const ranges = [[-180,180,1],[0,10,0.01],[0.1,3,0.01],[0.1,3,0.01],[0,1,0.01]];
    const sliders = [];

    labels.forEach((text, idx) => {
      const col = document.createElement('div');
      const lbl = document.createElement('label');
      lbl.textContent = text;
      const input = document.createElement('input');
      Object.assign(input, {
        type:'range',
        min:ranges[idx][0],
        max:ranges[idx][1],
        step:ranges[idx][2]
      });
      input.addEventListener('input', () => {
        if (selectedLayerIndex === null) return;
        const key = ['hue','saturation','brightness','contrast','alpha'][idx];
        currentFilters[selectedLayerIndex][key] = +input.value;
        applyFilter(selectedLayerIndex);
      });
      col.append(lbl, input);
      slidersPanel.append(col);
      sliders.push(input);
    });

    function loadSliders(i) {
      const f = currentFilters[i];
      [f.hue,f.saturation,f.brightness,f.contrast,f.alpha].forEach((v,k) => {
        sliders[k].value = v;
      });
    }

    function applyFilter(i) {
      const f = currentFilters[i];
      Object.assign(layerImgs[i].style, {
        filter: `hue-rotate(${f.hue}deg) saturate(${f.saturation}) brightness(${f.brightness}) contrast(${f.contrast})`,
        opacity: f.alpha
      });
    }

    if (selectedLayerIndex === 0) loadSliders(0);

    flexWrapper.append(compositeDiv, layersScroll);
    container.append(flexWrapper, slidersPanel);

  } catch (err) {
    container.textContent = `Error: ${err.message}`;
  }
}

function renderFallback(entry, container) {
  if (entry.img) {
    const img = document.createElement('img');
    img.src = entry.img;
    img.alt = '';
	img.style = 'max-width: 100%; height: 600px; display: block; margin: 0 auto;';
    container.append(img);
  } else {
    container.textContent = 'No image found in entry';
  }
}
