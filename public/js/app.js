document.addEventListener('DOMContentLoaded', () => {
    let departmentId = '';
    let keyword = '';
    let location = '';
    let page = 1;
    const itemsPerPage = 20;
    let objectIDs = [];


    const defaultImage = '/images/Sin_imagen_disponible.jpg'; 


    const translateText = async (text, targetLang = 'es') => {
        if (!text) return ''; 
        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await response.json();
            return data[0][0][0]; 
        } catch (error) {
            console.error('Error en la traducción:', error);
            return text; 
        }
    };


    function loadDepartments() {
        fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments')
            .then(response => response.json())
            .then(data => {
                const departmentSelect = document.getElementById('department');
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = 'Todos los departamentos';
                departmentSelect.appendChild(allOption);
                data.departments.forEach(department => {
                    const option = document.createElement('option');
                    option.value = department.departmentId;
                    option.textContent = department.displayName;
                    departmentSelect.appendChild(option);
                });
            });
    }

    
    function fetchInitialArtObjects() {
        fetch('https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=painting')
            .then(response => response.json())
            .then(data => {
                if (data.objectIDs && data.objectIDs.length > 0) {
                    objectIDs = data.objectIDs;
                    displayResults(objectIDs.slice(0, itemsPerPage));
                    if (objectIDs.length > itemsPerPage) {
                        updatePagination(Math.ceil(objectIDs.length / itemsPerPage), page);
                    } else {
                        document.querySelector('.pagination').style.display = 'none';
                    }
                } else {
                    document.getElementById('art-grid').innerHTML = '<p class="text-center">No se encontraron resultados</p>';
                    document.querySelector('.pagination').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error en la búsqueda:', error);
                document.getElementById('art-grid').innerHTML = '<p class="text-center">Ocurrió un error al buscar los objetos de arte.</p>';
            });
    }

   
    function searchArtObjects() {

        const keywordField = document.getElementById('keyword');
        const keywordError = document.getElementById('keyword-error');

        if (!keywordField.value) {
            keywordError.style.display = 'block';
            keywordField.classList.add('is-invalid');
            keywordField.focus();
            return;
        } else {
            keywordError.style.display = 'none';
            keywordField.classList.remove('is-invalid');
        }

        
        keyword = keywordField.value;
        location = document.getElementById('location').value;
        departmentId = document.getElementById('department').value;

        const combinedSearch = [keyword, location].filter(Boolean).join(' ');
        const q = combinedSearch ? `&q=${combinedSearch}` : '';
        const department = departmentId ? `&departmentId=${departmentId}` : '';

        fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true${q}${department}`)
            .then(response => response.json())
            .then(data => {
                if (data.objectIDs && data.objectIDs.length > 0) {
                    objectIDs = data.objectIDs;
                    displayResults(objectIDs.slice(0, itemsPerPage));
                    if (objectIDs.length > itemsPerPage) {
                        updatePagination(Math.ceil(objectIDs.length / itemsPerPage), page);
                    } else {
                        document.querySelector('.pagination').style.display = 'none';
                    }
                } else {
                    document.getElementById('art-grid').innerHTML = '<p class="text-center">No se encontraron resultados</p>';
                    document.querySelector('.pagination').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error en la búsqueda:', error);
                document.getElementById('art-grid').innerHTML = '<p class="text-center">Ocurrió un error al buscar los objetos de arte.</p>';
            });
    }

    
    async function displayResults(objectIDs) {
        const artGrid = document.getElementById('art-grid');
        artGrid.innerHTML = '';

        for (let objectID of objectIDs) {
            const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`);
            const object = await response.json();

            const translatedTitle = await translateText(object.title || 'Sin título');
            const translatedCulture = await translateText(object.culture || 'No disponible');
            const translatedDynasty = await translateText(object.dynasty || 'No disponible');

            const imageUrl = object.primaryImage ? object.primaryImage : defaultImage;

            const card = document.createElement('div');
            card.classList.add('col');
            card.innerHTML = `
                <div class="card">
                    <img src="${imageUrl}" class="card-img-top" alt="${translatedTitle}" data-bs-toggle="tooltip" title="Creado en: ${object.objectDate}">
                    <div class="card-body">
                        <h5 class="card-title">${translatedTitle}</h5>
                        <p class="card-text">Cultura: ${translatedCulture}</p>
                        <p class="card-text">Dinastía: ${translatedDynasty}</p>
                    </div>
                </div>
            `;

        
        if (object.primaryImage) {
            const viewImageButton = document.createElement('button');
            viewImageButton.classList.add('btn', 'btn-secondary', 'mt-2');
            viewImageButton.textContent = 'Ver imagen completa';
            viewImageButton.addEventListener('click', () => {
                openImageInModal(object.primaryImage);
            });

            card.querySelector('.card-body').appendChild(viewImageButton);
        }

        if (object.additionalImages && object.additionalImages.length > 0) {
            const viewMoreButton = document.createElement('button');
            viewMoreButton.classList.add('btn-view-more', 'mt-2');
            viewMoreButton.textContent = `Ver más fotos (${object.additionalImages.length + 1} fotos)`;
            viewMoreButton.setAttribute('data-bs-toggle', 'modal');
            viewMoreButton.setAttribute('data-bs-target', '#imageGalleryModal');

            viewMoreButton.addEventListener('click', () => {
                openImageGallery(object);  
            });

            card.querySelector('.card-body').appendChild(viewMoreButton);
        }

        artGrid.appendChild(card);

        
        const imgElement = card.querySelector('.card-img-top');
        const tooltip = new bootstrap.Tooltip(imgElement, {
            customClass: 'tooltip-date',
        });

        
        imgElement.addEventListener('mouseleave', () => {
            tooltip.hide();
        });

    }
}

    function updatePagination(totalPages, currentPage) {
        const pagination = document.querySelector('.pagination');
        pagination.innerHTML = '';

        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        } else {
            pagination.style.display = 'flex';
        }

        
        if (currentPage > 1) {
            const prevItem = document.createElement('li');
            prevItem.classList.add('page-item');
            prevItem.innerHTML = `<a class="page-link" href="#">Anterior</a>`;
            prevItem.addEventListener('click', (e) => {
                e.preventDefault();
                page -= 1;
                displayResults(objectIDs.slice((page - 1) * itemsPerPage, page * itemsPerPage));
                updatePagination(totalPages, page);
            });
            pagination.appendChild(prevItem);
        }

        
        let startPage = Math.max(1, currentPage - 2);  
        let endPage = Math.min(totalPages, currentPage + 2);  

        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(5, totalPages);
            } else if (endPage === totalPages) {
                startPage = Math.max(totalPages - 4, 1);
            }
        }

        
        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.classList.add('page-item');
            if (i === currentPage) {
                pageItem.classList.add('active');
            }
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener('click', (e) => {
                e.preventDefault();
                page = i;
                displayResults(objectIDs.slice((page - 1) * itemsPerPage, page * itemsPerPage));
                updatePagination(totalPages, page);
            });
            pagination.appendChild(pageItem);
        }

        
        if (currentPage < totalPages) {
            const nextItem = document.createElement('li');
            nextItem.classList.add('page-item');
            nextItem.innerHTML = `<a class="page-link" href="#">Siguiente</a>`;
            nextItem.addEventListener('click', (e) => {
                e.preventDefault();
                page += 1;
                displayResults(objectIDs.slice((page - 1) * itemsPerPage, page * itemsPerPage));
                updatePagination(totalPages, page);
            });
            pagination.appendChild(nextItem);
        }
    }

    
    function openImageInModal(imageUrl) {
        const imageGalleryContent = document.getElementById('imageGalleryContent');
        imageGalleryContent.innerHTML = '';

        const imageElement = document.createElement('div');
        imageElement.classList.add('col-12', 'mb-3');
        imageElement.innerHTML = `
            <img src="${imageUrl}" alt="Imagen completa" class="img-fluid rounded">
        `;
        imageGalleryContent.appendChild(imageElement);

        
        const modal = new bootstrap.Modal(document.getElementById('imageGalleryModal'));
        modal.show();
    }

    
    function openImageGallery(object) {
        const imageGalleryContent = document.getElementById('imageGalleryContent');
        imageGalleryContent.innerHTML = '';  

        const primaryImageElement = document.createElement('div');
        primaryImageElement.classList.add('col-12', 'mb-3');
        primaryImageElement.innerHTML = `
            <img src="${object.primaryImage}" alt="${object.title}" class="img-fluid rounded">
        `;
        imageGalleryContent.appendChild(primaryImageElement);

        if (object.additionalImages && object.additionalImages.length > 0) {
            object.additionalImages.forEach(imageUrl => {
                const imageElement = document.createElement('div');
                imageElement.classList.add('col-6', 'col-md-4', 'mb-3');
                imageElement.innerHTML = `
                    <img src="${imageUrl}" alt="${object.title}" class="img-fluid rounded">
                `;
                imageGalleryContent.appendChild(imageElement);
            });
        }
    }

    
    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        departmentId = document.getElementById('department').value;
        keyword = document.getElementById('keyword').value;
        location = document.getElementById('location').value;
        page = 1;
        searchArtObjects();
    });

    
    loadDepartments();
    fetchInitialArtObjects();
});