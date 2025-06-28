let availableMods = [];
let selectedMods = [];

document.addEventListener("DOMContentLoaded", () => {
    initModsUI();
    loadMods();
});

function loadMods() {
    fetch("/mods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
    .then(res => res.json())
    .then(data => {
        if (data.mods && data.mods.length > 0) {
            availableMods = data.mods;
            renderModsModal();
        }
    })
    .catch(err => {
        console.error("Ошибка загрузки модов:", err);
    });
}

function renderModsModal() {
    const container = document.getElementById("available-mods");
    container.innerHTML = "";

    const modList = document.createElement("div");
    modList.className = "mod-list";

    availableMods.forEach(mod => {
        const modItem = document.createElement("div");
        modItem.className = "mod-item";
        modItem.dataset.modName = mod.name;
        modItem.innerHTML = `
            <h4>${mod.label}</h4>
            <p>${mod.description || "Описание отсутствует"}</p>
        `;

        if (selectedMods.find(m => m.name === mod.name)) {
            modItem.classList.add("selected");
        }

        modItem.addEventListener("click", () => {
            modItem.classList.toggle("selected");
        });

        modList.appendChild(modItem);
    });

    container.appendChild(modList);
}

function renderSelectedMods() {
    const container = document.getElementById("selected-mods");
    container.innerHTML = "";

    if (selectedMods.length === 0) {
        const noModsMessage = document.createElement("p");
        noModsMessage.id = "no-mods-message";
        noModsMessage.textContent = "Эффекты не выбраны";
        container.appendChild(noModsMessage);
        return;
    }

    selectedMods.forEach((mod, index) => {
        const modConfig = availableMods.find(m => m.name === mod.name);
        if (!modConfig) return;

        const modCard = document.createElement("div");
        modCard.className = "mod-card";
        modCard.dataset.modName = mod.name;

        let paramsHTML = '';
        modConfig.params.forEach(param => {
            const currentValue = mod.params[param.name] || param.default;
            paramsHTML += generateParamHTML(mod.name, param, currentValue);
        });

        modCard.innerHTML = `
            <div class="mod-card-header">
                <span class="mod-card-title">${modConfig.label}</span>
                <button class="remove-mod-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mod-card-body">
                ${paramsHTML}
            </div>
        `;

        container.appendChild(modCard);
    });

    container.querySelectorAll("input[type='text'], input[type='range']").forEach(input => {
        input.addEventListener("input", () => {
            updateModParams(input);
        });
    });

    container.querySelectorAll("input[type='range']").forEach(rangeInput => {
        const valueSpan = rangeInput.nextElementSibling;
        if (valueSpan && valueSpan.tagName === "SPAN") {
            valueSpan.textContent = rangeInput.value;
            rangeInput.addEventListener("input", () => {
                valueSpan.textContent = rangeInput.value;
            });
        }
    });

    container.querySelectorAll(".mod-file-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const inputId = btn.dataset.for;
            const input = document.getElementById(inputId);
            if (input) input.click();
        });
    });

    container.querySelectorAll(".mod-file-input").forEach(input => {
        input.addEventListener("change", () => {
            const modName = input.id.split("-")[1];
            const paramName = input.id.split("-")[2];
            const fileInfo = document.getElementById(`${input.id}-info`);
            const fileName = document.getElementById(`${input.id}-name`);

            const modIndex = selectedMods.findIndex(m => m.name === modName);
            if (modIndex === -1) return;

            if (input.files.length > 0) {
                const file = input.files[0];
                fileName.textContent = file.name;
                fileInfo.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Загрузка...`;

                handleFileUpload({ target: { files: [file] } }, 'mod-file', (path, error) => {
                    if (path) {
                        fileInfo.innerHTML = `<i class="fas fa-check-circle mod-file-icon"></i> Файл загружен`;
                        selectedMods[modIndex].params[paramName] = path;
                        input.setAttribute('data-upload-path', path);
                    } else {
                        fileInfo.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Ошибка загрузки`;
                        fileName.textContent = "";
                        input.removeAttribute('data-upload-path');
                        delete selectedMods[modIndex].params[paramName];
                    }
                });
            } else {
                fileInfo.innerHTML = `<i class="fas fa-info-circle"></i> Файл не выбран`;
                fileName.textContent = "";
                input.removeAttribute('data-upload-path');
                delete selectedMods[modIndex].params[paramName];
            }
        });
    });
}

function generateParamHTML(modName, param, currentValue) {
    const paramId = `mod-${modName}-${param.name}`;

    if (param.type === "slider") {
        return `
            <div class="mod-param">
                <label for="${paramId}">${param.label}</label>
                <input type="range" id="${paramId}" 
                       min="${param.min}" max="${param.max}" 
                       value="${currentValue}" 
                       class="settings-range">
                <span>${currentValue}</span>
            </div>
        `;
    } else if (param.type === "text") {
        return `
            <div class="mod-param">
                <label for="${paramId}">${param.label}</label>
                <input type="text" id="${paramId}" 
                       value="${currentValue}" 
                       class="settings-input">
            </div>
        `;
    } else if (param.type === "file") {
        return `
            <div class="mod-param">
                <label for="${paramId}">${param.label}</label>
                <div class="mod-file-upload">
                    <button class="mod-file-btn" data-for="${paramId}">
                        <i class="fas fa-upload"></i> Выбрать файл
                    </button>
                    <input type="file" id="${paramId}" 
                           class="mod-file-input" 
                           accept="${param.accept || "*/*"}" 
                           style="display: none;">
                    <div class="mod-file-info" id="${paramId}-info">
                        <i class="fas fa-info-circle"></i> Файл не выбран
                    </div>
                    <span class="mod-file-name" id="${paramId}-name"></span>
                </div>
            </div>
        `;
    }

    return "";
}

function updateModParams(input) {
    const modName = input.id.split("-")[1];
    const paramName = input.id.split("-")[2];

    const modIndex = selectedMods.findIndex(m => m.name === modName);
    if (modIndex === -1) return;

    if (!selectedMods[modIndex].params) {
        selectedMods[modIndex].params = {};
    }

    let value;
    if (input.type === "file") {
        return;
    } else {
        value = input.value;
        if (!isNaN(value) && value.trim() !== "") {
            value = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
        }
    }

    selectedMods[modIndex].params[paramName] = value;
}

function collectMods() {
    return selectedMods.map(mod => ({
        name: mod.name,
        params: mod.params || {}
    }));
}

function initModsUI() {
    document.getElementById("add-mod-btn").addEventListener("click", () => {
        renderModsModal();
        document.getElementById("mods-modal").style.display = "block";
    });

    document.querySelector(".close-modal").addEventListener("click", () => {
        document.getElementById("mods-modal").style.display = "none";
    });

    document.getElementById("apply-mods").addEventListener("click", () => {
        const selectedItems = document.querySelectorAll(".mod-item.selected");

        selectedMods = [];
        selectedItems.forEach(item => {
            const modName = item.dataset.modName;
            const mod = availableMods.find(m => m.name === modName);
            if (mod) {
                const defaultParams = {};
                mod.params.forEach(param => {
                    defaultParams[param.name] = param.default;
                });

                selectedMods.push({
                    name: mod.name,
                    params: defaultParams
                });
            }
        });

        renderSelectedMods();
        document.getElementById("mods-modal").style.display = "none";
        updatePreview();
    });

    document.getElementById("selected-mods").addEventListener("click", (e) => {
        if (e.target.closest(".remove-mod-btn")) {
            const index = parseInt(e.target.closest(".remove-mod-btn").dataset.index);
            selectedMods.splice(index, 1);
            renderSelectedMods();
            updatePreview();
        }
    });
}
