// modal.js

function createModal(title, message, buttonText, callback) {
    const modal = document.createElement('div');
    modal.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);backdrop-filter: blur(10px);color:white;display:flex;justify-content:center;align-items:center;z-index:10000;';

    const modalContent = document.createElement('div');
    modalContent.style = 'text-align:center;padding:30px;border:2px solid white;background:black;border-radius: 6px;';

    const modalTitle = document.createElement('h2');
    modalTitle.textContent = title;
    modalContent.appendChild(modalTitle);

    const modalMessage = document.createElement('p');
    modalMessage.textContent = message;
    modalContent.appendChild(modalMessage);

    const modalButton = document.createElement('button');
    modalButton.textContent = buttonText;
    modalButton.classList.add('btn');
    modalButton.onclick = function() {
        callback();
        document.body.removeChild(modal);
    };
    modalContent.appendChild(modalButton);

    modal.appendChild(modalContent);

    document.body.appendChild(modal);
}

function createAgeModal() {
    const params = new URLSearchParams(location.search);
    const content = document.getElementById('page_contents');

    if (params.get('age_modal') !== 'true') {
        content.classList.add('hide');

        createModal(
            'Are you over 18?',
            'This site contains content aimed at people aged 18 and older. By pressing "I Agree", you confirm you are at least 18 years old.',
            'I Agree',
            () => {
                params.set('age_modal', 'true');
                location.search = params.toString();
            }
        );
    } else {
        content.classList.remove('hide');
        appendUrlParamsToLinks();
    }
}

function appendUrlParamsToLinks() {
    const cur = new URLSearchParams(location.search);
    ['hidden'].forEach(k => cur.delete(k));
    if (!cur.toString()) return;

    document.querySelectorAll('a[data-append-params]').forEach(link => {
        const u = new URL(link.href, location.origin);
        cur.forEach((v, k) => {
            if (!u.searchParams.has(k)) u.searchParams.set(k, v);
        });
        link.href = u.toString();
    });
}

function toggleElementsBasedOnQuery() {
    const hidden = new URLSearchParams(location.search).get('hidden')?.split(',') || [];
    if (hidden.length) {
        document.querySelectorAll('[id]').forEach(el => {
            if (hidden.includes(el.id)) el.classList.add('hide');
        });
    }
}

function shuffle(array) {
		  for (let i = array.length - 1; i > 0; i--) {
		    const j = Math.floor(Math.random() * (i + 1));
		    [array[i], array[j]] = [array[j], array[i]];
		  }
		}

window.onload = () => {
    createAgeModal();
    toggleElementsBasedOnQuery();
};
