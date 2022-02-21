//criando o editor de texto dentro de todas as tags de id 'ta'
ClassicEditor
    .create(document.getElementById('ta'))
    .catch( error => {
        console.error(error);
    });


//confirmando a exclusão dos itens
$('a#confirmDeletion').on('click', () => {
    if(!confirm('Are you sure?')){
        return false;
    }
});
